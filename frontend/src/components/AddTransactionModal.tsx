"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  LoaderCircle,
  MessageSquare,
  ScanLine,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";

import { useLanguage } from "@/context/LanguageContext";
import { createTransaction, fetchCategories, fetchWallets } from "@/lib/api";
import { t } from "@/lib/i18n";
import { getWalletTypeLabel } from "@/lib/walletLabels";
import type {
  Category,
  Currency,
  Institution,
  Transaction,
  TransactionCreate,
} from "@/types";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (transaction: Transaction) => void;
}

type TransactionKind = "expense" | "income";

function getDefaultDateTimeLocal() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function getMaxDateTimeLocal() {
  return getDefaultDateTimeLocal();
}

function getInitialTransactionForm(): TransactionCreate {
  return {
    institution_id: undefined,
    category_id: undefined,
    amount: "",
    currency: "USD",
    description: "",
    transaction_date: getDefaultDateTimeLocal(),
  };
}

function formatWalletBalance(wallet: Institution, locale: "en" | "ar") {
  const amount = Number(wallet.current_balance);
  const normalizedAmount = Number.isFinite(amount) ? amount : 0;

  if (wallet.card_type === "Cash_LBP") {
    const formatted = new Intl.NumberFormat(locale === "ar" ? "ar-LB" : "en-US", {
      maximumFractionDigits: 0,
    }).format(normalizedAmount);

    return locale === "ar" ? `${formatted} ل.ل` : `${formatted} LBP`;
  }

  return new Intl.NumberFormat(locale === "ar" ? "ar-LB" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(normalizedAmount);
}

export function AddTransactionModal({
  isOpen,
  onClose,
  onCreated,
}: AddTransactionModalProps) {
  const { locale } = useLanguage();
  const [wallets, setWallets] = useState<Institution[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactionKind, setTransactionKind] = useState<TransactionKind>("expense");
  const [form, setForm] = useState<TransactionCreate>(() => getInitialTransactionForm());
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;

    async function loadFormData() {
      setIsLoadingData(true);
      setError(null);

      try {
        const [walletRows, categoryRows] = await Promise.all([
          fetchWallets(),
          fetchCategories(),
        ]);

        if (!isMounted) {
          return;
        }

        setWallets(walletRows);
        setCategories(categoryRows);
      } catch {
        if (isMounted) {
          setError("load_failed");
        }
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    }

    void loadFormData();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const groupedCategories = useMemo(() => {
    return {
      income: categories.filter((category) => category.type === "income"),
      expense: categories.filter((category) => category.type === "expense"),
    };
  }, [categories]);

  const suggestedCategories = groupedCategories[transactionKind];

  const selectedWallet = useMemo(
    () => wallets.find((wallet) => wallet.id === form.institution_id),
    [form.institution_id, wallets],
  );

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === form.category_id),
    [categories, form.category_id],
  );

  const lockedCurrency: Currency | null =
    selectedWallet?.card_type === "Cash_LBP"
      ? "LBP"
      : selectedWallet?.card_type === "Cash_USD"
        ? "USD"
        : null;

  const effectiveCurrency = lockedCurrency ?? form.currency;

  if (!isOpen) {
    return null;
  }

  function resetState() {
    setForm(getInitialTransactionForm());
    setTransactionKind("expense");
    setError(null);
    setBackendError(null);
    setIsLoadingData(false);
    setIsSubmitting(false);
    setIsMoreOptionsOpen(false);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  async function handleSubmit() {
    if (new Date(form.transaction_date).getTime() > Date.now()) {
      setError("future_date");
      setBackendError(null);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setBackendError(null);

    try {
      const transaction = await createTransaction({
        institution_id: form.institution_id,
        category_id: form.category_id,
        amount: form.amount,
        currency: effectiveCurrency,
        description: form.description?.trim() || undefined,
        transaction_date: new Date(form.transaction_date).toISOString(),
      });

      onCreated(transaction);
      handleClose();
    } catch (caughtError) {
      if (axios.isAxiosError(caughtError)) {
        const detail = caughtError.response?.data?.detail;

        if (typeof detail === "string") {
          setBackendError(detail);
        } else if (Array.isArray(detail) && detail.length > 0) {
          const firstIssue = detail[0];
          if (typeof firstIssue?.msg === "string") {
            setBackendError(firstIssue.msg);
          } else {
            setBackendError(JSON.stringify(firstIssue));
          }
        }
      }
      setError("create_failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleTransactionKindChange(nextKind: TransactionKind) {
    setTransactionKind(nextKind);
    setForm((current) => ({
      ...current,
      category_id:
        categories.find(
          (category) =>
            category.id === current.category_id && category.type === nextKind,
        )?.id ?? undefined,
    }));
  }

  const cannotSubmit =
    !form.institution_id ||
    !form.category_id ||
    form.amount === "" ||
    Number(form.amount) <= 0 ||
    !form.transaction_date;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
        <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {t("add_transaction", locale)}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Faster manual entry first, advanced details only when you need them.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
              aria-label={t("cancel", locale)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-5 overflow-y-auto px-6 py-5">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Alternate capture
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Use receipt scan or paste the bank SMS when manual entry is slower.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/transactions/import"
                    onClick={handleClose}
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <ScanLine className="h-4 w-4" />
                    {t("scan_receipt", locale)}
                  </Link>
                  <Link
                    href="/transactions/import"
                    onClick={handleClose}
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {t("paste_sms", locale)}
                  </Link>
                </div>
              </div>
            </section>

            <section className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800">
                  1. {t("type", locale)}
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["expense", "income"] as TransactionKind[]).map((kind) => {
                    const isActive = transactionKind === kind;

                    return (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => handleTransactionKindChange(kind)}
                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                          isActive
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-[var(--border)] bg-white text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        <p className="text-sm font-semibold">{t(kind, locale)}</p>
                        <p
                          className={`mt-1 text-sm ${
                            isActive ? "text-slate-200" : "text-[var(--muted)]"
                          }`}
                        >
                          {kind === "expense"
                            ? "Track spending from a wallet."
                            : "Track money coming in."}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800">
                  2. {t("wallets", locale)}
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {wallets.map((wallet) => {
                    const isSelected = form.institution_id === wallet.id;

                    return (
                      <button
                        key={wallet.id}
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            institution_id: wallet.id,
                          }))
                        }
                        className={`rounded-2xl border p-4 text-left transition ${
                          isSelected
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-[var(--border)] bg-white text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{wallet.name}</p>
                            <p
                              className={`mt-1 text-xs ${
                                isSelected ? "text-slate-200" : "text-[var(--muted)]"
                              }`}
                            >
                              {getWalletTypeLabel(wallet.card_type, locale)}
                            </p>
                          </div>
                          <div
                            className={`rounded-xl p-2 ${
                              isSelected
                                ? "bg-white/10 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <Wallet className="h-4 w-4" />
                          </div>
                        </div>
                        <p
                          className={`mt-4 text-sm font-medium ${
                            isSelected ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {formatWalletBalance(wallet, locale)}
                        </p>
                      </button>
                    );
                  })}
                </div>
                {!isLoadingData && wallets.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {t("no_wallets_available", locale)}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800">
                    3. {t("amount", locale)}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={String(form.amount)}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                    placeholder={transactionKind === "expense" ? "0.00" : "0.00"}
                    className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-lg text-slate-900 outline-none transition focus:border-slate-400"
                  />
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                  {effectiveCurrency}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-slate-800">
                    4. Suggested categories
                  </label>
                  {selectedCategory ? (
                    <span className="text-sm text-[var(--muted)]">
                      Selected: {locale === "ar" ? selectedCategory.name_ar : selectedCategory.name_en}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestedCategories.map((category) => {
                    const isActive = form.category_id === category.id;

                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            category_id: category.id,
                          }))
                        }
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                          isActive
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-[var(--border)] bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {locale === "ar" ? category.name_ar : category.name_en}
                      </button>
                    );
                  })}
                </div>
                {!isLoadingData && suggestedCategories.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {t("no_categories_available", locale)}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--border)] bg-white">
              <button
                type="button"
                onClick={() => setIsMoreOptionsOpen((current) => !current)}
                className="flex w-full items-center justify-between px-4 py-4 text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">More options</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Description, date, category dropdown, and currency override.
                  </p>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-slate-500 transition ${
                    isMoreOptionsOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isMoreOptionsOpen ? (
                <div className="grid gap-4 border-t border-[var(--border)] px-4 py-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium text-slate-800">
                      {t("category", locale)}
                    </label>
                    <select
                      value={form.category_id ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          category_id: event.target.value
                            ? Number(event.target.value)
                            : undefined,
                        }))
                      }
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    >
                      <option value="">{t("select_category", locale)}</option>
                      {suggestedCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {locale === "ar" ? category.name_ar : category.name_en}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-800">
                      {t("description", locale)}
                    </label>
                    <input
                      type="text"
                      value={form.description ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-800">
                      {t("transaction_date", locale)}
                    </label>
                    <input
                      type="datetime-local"
                      value={form.transaction_date}
                      max={getMaxDateTimeLocal()}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          transaction_date: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium text-slate-800">
                      {t("currency", locale)}
                    </label>
                    <div className="flex gap-3">
                      {(["LBP", "USD"] as Currency[]).map((currencyOption) => (
                        <label
                          key={currencyOption}
                          className={`flex flex-1 items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                            effectiveCurrency === currencyOption
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-[var(--border)] bg-white text-slate-700"
                          } ${lockedCurrency && lockedCurrency !== currencyOption ? "opacity-60" : ""}`}
                        >
                          <input
                            type="radio"
                            name="currency"
                            value={currencyOption}
                            checked={effectiveCurrency === currencyOption}
                            disabled={Boolean(
                              lockedCurrency && lockedCurrency !== currencyOption,
                            )}
                            onChange={() =>
                              setForm((current) => ({
                                ...current,
                                currency: currencyOption,
                              }))
                            }
                            className="sr-only"
                          />
                          {currencyOption}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            {isLoadingData ? (
              <div className="rounded-xl border border-[var(--border)] bg-slate-50 px-4 py-3 text-sm text-[var(--muted)]">
                {t("loading_dashboard", locale)}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error === "future_date"
                  ? t("future_transaction_date", locale)
                  : error === "load_failed"
                    ? t("failed_to_load_transaction_form", locale)
                    : backendError ?? t("transaction_created_failed", locale)}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-6 py-4">
            <p className="text-sm text-[var(--muted)]">
              5. Save after wallet, amount, and category are selected.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {t("cancel", locale)}
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={cannotSubmit || isSubmitting || wallets.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                {isSubmitting ? t("creating_transaction", locale) : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
