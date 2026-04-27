"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ClipboardCheck, LoaderCircle } from "lucide-react";
import Link from "next/link";

import { useLanguage } from "@/context/LanguageContext";
import {
  claimTransaction,
  fetchCategories,
  fetchPendingTransactions,
  fetchTags,
  fetchWallets,
} from "@/lib/api";
import { t } from "@/lib/i18n";
import type {
  Category,
  Currency,
  Institution,
  Numeric,
  Tag,
  Transaction,
} from "@/types";

function toNumber(value: Numeric | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsedValue =
    typeof value === "number" ? value : Number.parseFloat(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatAmount(value: Numeric, currency: Currency, locale: "en" | "ar") {
  const amount = toNumber(value);

  if (currency === "USD") {
    return new Intl.NumberFormat(locale === "ar" ? "ar-LB" : "en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  }

  const formatted = new Intl.NumberFormat(locale === "ar" ? "ar-LB" : "en-US", {
    maximumFractionDigits: 0,
  }).format(amount);

  return locale === "ar" ? `${formatted} ل.ل` : `${formatted} LBP`;
}

function formatDate(value: string, locale: "en" | "ar") {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-LB" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function getMaxDateTimeLocal() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function getSourceLabel(source: Transaction["source"], locale: "en" | "ar") {
  if (source === "auto_card") {
    return t("visa_auto_pay", locale);
  }
  if (source === "ocr") {
    return t("ocr_scan", locale);
  }
  if (source === "recurring") {
    return t("recurring_event", locale);
  }
  return t("manual_entry", locale);
}

export default function ReviewTransactionsPage() {
  const { locale } = useLanguage();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Institution[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isMobileReviewOpen, setIsMobileReviewOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [draft, setDraft] = useState({
    institution_id: undefined as number | undefined,
    amount: "",
    currency: "USD" as Currency,
    description: "",
    transaction_date: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const [transactionRows, walletRows, categoryRows] = await Promise.all([
          fetchPendingTransactions(),
          fetchWallets(),
          fetchCategories(),
        ]);

        if (!isMounted) {
          return;
        }

        setTransactions(transactionRows);
        setWallets(walletRows);
        setCategories(categoryRows);

        const queryTransactionId = Number(
          new URLSearchParams(window.location.search).get("transactionId"),
        );
        const preferredTransaction = transactionRows.find(
          (transaction) => transaction.id === queryTransactionId,
        );
        setSelectedId(preferredTransaction?.id ?? transactionRows[0]?.id ?? null);
        setIsMobileReviewOpen(Boolean(preferredTransaction));
      } catch {
        if (isMounted) {
          setError("load_failed");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedTransaction = useMemo(
    () => transactions.find((transaction) => transaction.id === selectedId) ?? null,
    [selectedId, transactions],
  );

  useEffect(() => {
    let isCancelled = false;

    function syncSelectionState() {
      if (isCancelled) {
        return;
      }

      if (!selectedTransaction) {
        setSelectedCategoryId(null);
        setSelectedTagIds([]);
        setTags([]);
        return;
      }

      setSelectedCategoryId(selectedTransaction.category?.id ?? null);
      setSelectedTagIds(selectedTransaction.tags.map((tag) => tag.id));
      if (!selectedTransaction.category) {
        setTags([]);
      }
      setDraft({
        institution_id: selectedTransaction.institution_id ?? undefined,
        amount: String(selectedTransaction.amount),
        currency: selectedTransaction.currency,
        description: selectedTransaction.description ?? "",
        transaction_date: toDateTimeLocal(selectedTransaction.transaction_date),
      });
    }

    window.queueMicrotask(syncSelectionState);

    return () => {
      isCancelled = true;
    };
  }, [selectedTransaction]);

  useEffect(() => {
    if (!selectedTransaction) {
      return;
    }

    const categoryId = selectedCategoryId;
    if (categoryId === null) {
      return;
    }

    const activeCategoryId = categoryId;
    let isMounted = true;

    async function loadTags() {
      setIsLoadingTags(true);
      setError(null);

      try {
        const tagRows = await fetchTags(activeCategoryId);

        if (isMounted) {
          setTags(tagRows);
        }
      } catch {
        if (isMounted) {
          setError("claim_data");
        }
      } finally {
        if (isMounted) {
          setIsLoadingTags(false);
        }
      }
    }

    void loadTags();

    return () => {
      isMounted = false;
    };
  }, [selectedCategoryId, selectedTransaction]);

  const groupedCategories = useMemo(() => {
    return {
      income: categories.filter((category) => category.type === "income"),
      expense: categories.filter((category) => category.type === "expense"),
    };
  }, [categories]);

  const selectedWallet = useMemo(
    () => wallets.find((wallet) => wallet.id === draft.institution_id),
    [draft.institution_id, wallets],
  );

  const lockedCurrency: Currency | null =
    selectedWallet?.card_type === "Cash_LBP"
      ? "LBP"
      : selectedWallet?.card_type === "Cash_USD"
        ? "USD"
        : null;
  const effectiveCurrency = lockedCurrency ?? draft.currency;

  const cannotSubmit =
    !selectedTransaction ||
    !draft.institution_id ||
    draft.amount === "" ||
    Number(draft.amount) <= 0 ||
    !draft.transaction_date ||
    !selectedCategoryId;

  function toggleTag(tagId: number) {
    setSelectedTagIds((currentTagIds) =>
      currentTagIds.includes(tagId)
        ? currentTagIds.filter((id) => id !== tagId)
        : [...currentTagIds, tagId],
    );
  }

  async function handleSubmit() {
    if (!selectedTransaction || !selectedCategoryId) {
      return;
    }
    if (new Date(draft.transaction_date).getTime() > Date.now()) {
      setError("future_date");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await claimTransaction(selectedTransaction.id, {
        institution_id: draft.institution_id,
        amount: draft.amount,
        currency: effectiveCurrency,
        description: draft.description.trim() || null,
        transaction_date: new Date(draft.transaction_date).toISOString(),
        category_id: selectedCategoryId,
        tag_ids: selectedTagIds,
      });

      const nextTransactions = transactions.filter(
        (transaction) => transaction.id !== selectedTransaction.id,
      );
      setTransactions(nextTransactions);
      setSelectedId(nextTransactions[0]?.id ?? null);
      setIsMobileReviewOpen(false);
    } catch {
      setError("claim_submit");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--muted)]">
            {t("transactions", locale)}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">
            {t("review_workspace", locale)}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            {t("review_workspace_description", locale)}
          </p>
        </div>
        <Link
          href="/transactions/import"
          className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          {t("import_transactions", locale)}
        </Link>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error === "future_date"
            ? t("future_transaction_date", locale)
            : error === "load_failed"
              ? t("failed_to_load_transactions", locale)
              : error === "claim_data"
                ? t("failed_to_load_claim_data", locale)
                : t("failed_to_claim_transaction", locale)}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-slate-50 px-4 py-12 text-center text-sm text-[var(--muted)]">
          {t("loading_dashboard", locale)}
        </div>
      ) : null}

      {!isLoading && transactions.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-[var(--border)] bg-slate-50 px-4 py-16 text-center">
          <ClipboardCheck className="mx-auto h-8 w-8 text-slate-500" />
          <h3 className="mt-4 text-lg font-semibold text-slate-900">
            {t("no_transactions_to_review", locale)}
          </h3>
          <Link
            href="/transactions"
            className="mt-5 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium !text-white transition hover:bg-slate-800"
          >
            {t("transactions", locale)}
          </Link>
        </section>
      ) : null}

      {!isLoading && transactions.length > 0 ? (
        <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside
            className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm ${
              isMobileReviewOpen ? "hidden xl:block" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">
                {t("queue", locale)}
              </h3>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                {transactions.length}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {transactions.map((transaction) => {
                const isActive = transaction.id === selectedId;

                return (
                  <button
                    key={transaction.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(transaction.id);
                      setIsMobileReviewOpen(true);
                    }}
                    className={`w-full rounded-xl border p-3 text-start transition ${
                      isActive
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-[var(--border)] bg-white text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="line-clamp-1 text-sm font-semibold">
                          {transaction.description || t("no_description", locale)}
                        </p>
                        <p
                          className={`mt-1 text-xs ${
                            isActive ? "text-slate-200" : "text-[var(--muted)]"
                          }`}
                        >
                          {getSourceLabel(transaction.source, locale)} -{" "}
                          {formatDate(transaction.transaction_date, locale)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatAmount(transaction.amount, transaction.currency, locale)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section
            className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm ${
              isMobileReviewOpen ? "block" : "hidden xl:block"
            }`}
          >
            {!selectedTransaction ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-slate-50 px-4 py-12 text-center text-sm text-[var(--muted)]">
                {t("select_transaction_to_review", locale)}
              </div>
            ) : (
              <div className="space-y-6">
                <button
                  type="button"
                  onClick={() => setIsMobileReviewOpen(false)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 xl:hidden"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("queue", locale)}
                </button>

                <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                      {t("status", locale)}
                    </p>
                    <p className="mt-1 text-base font-medium text-slate-900">
                      {t(selectedTransaction.status, locale)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                      {t("source", locale)}
                    </p>
                    <p className="mt-1 text-base font-medium text-slate-900">
                      {getSourceLabel(selectedTransaction.source, locale)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                      {t("amount", locale)}
                    </p>
                    <p className="mt-1 text-base font-medium text-slate-900">
                      {formatAmount(
                        selectedTransaction.amount,
                        selectedTransaction.currency,
                        locale,
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-800">
                      {t("wallets", locale)}
                    </label>
                    <select
                      value={draft.institution_id ?? ""}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          institution_id: event.target.value
                            ? Number(event.target.value)
                            : undefined,
                        }))
                      }
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    >
                      <option value="">{t("select_wallet", locale)}</option>
                      {wallets.map((wallet) => (
                        <option key={wallet.id} value={wallet.id}>
                          {wallet.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-800">
                      {t("category", locale)}
                    </label>
                    <select
                      value={selectedCategoryId ?? ""}
                      onChange={(event) => {
                        setTags([]);
                        setSelectedTagIds([]);
                        setSelectedCategoryId(
                          event.target.value ? Number(event.target.value) : null,
                        );
                      }}
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    >
                      <option value="">{t("select_category", locale)}</option>
                      <optgroup label={t("income", locale)}>
                        {groupedCategories.income.map((category) => (
                          <option key={category.id} value={category.id}>
                            {locale === "ar" ? category.name_ar : category.name_en}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label={t("expense", locale)}>
                        {groupedCategories.expense.map((category) => (
                          <option key={category.id} value={category.id}>
                            {locale === "ar" ? category.name_ar : category.name_en}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-800">
                      {t("amount", locale)}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.amount}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          amount: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </div>

                  <div className="space-y-2">
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
                            name="review-currency"
                            value={currencyOption}
                            checked={effectiveCurrency === currencyOption}
                            disabled={Boolean(
                              lockedCurrency && lockedCurrency !== currencyOption,
                            )}
                            onChange={() =>
                              setDraft((current) => ({
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

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-800">
                      {t("description", locale)}
                    </label>
                    <input
                      type="text"
                      value={draft.description}
                      onChange={(event) =>
                        setDraft((current) => ({
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
                      value={draft.transaction_date}
                      max={getMaxDateTimeLocal()}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          transaction_date: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-800">
                    {t("available_tags", locale)}
                  </p>
                  {selectedCategoryId ? (
                    tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => {
                          const isSelected = selectedTagIds.includes(tag.id);

                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => toggleTag(tag.id)}
                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${
                                isSelected
                                  ? "border-slate-900 bg-slate-900 text-white"
                                  : "border-[var(--border)] bg-white text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              {isSelected ? <Check className="h-4 w-4" /> : null}
                              {locale === "ar" ? tag.name_ar : tag.name_en}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--muted)]">
                        {isLoadingTags
                          ? t("loading_dashboard", locale)
                          : t("no_tags_available", locale)}
                      </p>
                    )
                  ) : (
                    <p className="text-sm text-[var(--muted)]">
                      {t("choose_category_first", locale)}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const currentIndex = transactions.findIndex(
                        (transaction) => transaction.id === selectedTransaction.id,
                      );
                      setSelectedId(
                        transactions[currentIndex + 1]?.id ??
                          transactions[0]?.id ??
                          null,
                      );
                    }}
                    className="rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    {t("review_next", locale)}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={cannotSubmit || isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isSubmitting ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : null}
                    {isSubmitting ? t("saving", locale) : t("assign_and_confirm", locale)}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
