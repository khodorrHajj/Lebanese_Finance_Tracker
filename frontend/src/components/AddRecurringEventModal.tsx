"use client";

import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, X } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import {
  createRecurringSchedule,
  fetchCategories,
  fetchWallets,
} from "@/lib/api";
import { t } from "@/lib/i18n";
import type {
  Category,
  Currency,
  Institution,
  RecurringSchedule,
} from "@/types";

interface AddRecurringEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (schedule: RecurringSchedule) => void;
}

function getTodayLocalDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

export function AddRecurringEventModal({
  isOpen,
  onClose,
  onCreated,
}: AddRecurringEventModalProps) {
  const { locale } = useLanguage();
  const [wallets, setWallets] = useState<Institution[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    institution_id: "",
    category_id: "",
    amount: "",
    currency: "USD" as Currency,
    description: "",
    start_date: getTodayLocalDate(),
    monthly_days: "",
    include_first_day: false,
    include_last_day: false,
  });
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    async function loadData() {
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

    void loadData();

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

  const selectedWallet = useMemo(
    () => wallets.find((wallet) => wallet.id === Number(form.institution_id)),
    [form.institution_id, wallets],
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

  function resetAndClose() {
    setForm({
      institution_id: "",
      category_id: "",
      amount: "",
      currency: "USD",
      description: "",
      start_date: getTodayLocalDate(),
      monthly_days: "",
      include_first_day: false,
      include_last_day: false,
    });
    setError(null);
    setIsSubmitting(false);
    onClose();
  }

  function parseMonthlyDays(rawValue: string) {
    return Array.from(
      new Set(
        rawValue
      .split(",")
      .map((chunk) => Number(chunk.trim()))
      .filter((value) => Number.isInteger(value) && value >= 1 && value <= 31),
      ),
    );
  }

  async function handleSubmit() {
    const monthlyDays = parseMonthlyDays(form.monthly_days);
    if (form.include_first_day) {
      monthlyDays.unshift(1);
    }

    const normalizedMonthlyDays = Array.from(new Set(monthlyDays)).sort(
      (left, right) => left - right,
    );

    setIsSubmitting(true);
    setError(null);

    try {
      const schedule = await createRecurringSchedule({
        institution_id: Number(form.institution_id),
        category_id: Number(form.category_id),
        amount: form.amount,
        currency: effectiveCurrency,
        description: form.description.trim() || null,
        start_date: form.start_date,
        monthly_days: normalizedMonthlyDays,
        include_last_day: form.include_last_day,
      });
      onCreated(schedule);
      resetAndClose();
    } catch {
      setError("create_failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  const cannotSubmit =
    !form.institution_id ||
    !form.category_id ||
    form.amount === "" ||
    Number(form.amount) <= 0 ||
    (!form.include_first_day &&
      !form.include_last_day &&
      parseMonthlyDays(form.monthly_days).length === 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {t("add_recurring_event", locale)}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {t("add_recurring_event_description", locale)}
            </p>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
            aria-label={t("cancel", locale)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            {t("recurring_event_note", locale)}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">
                {t("wallets", locale)}
              </label>
              <select
                value={form.institution_id}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    institution_id: event.target.value,
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
                value={form.category_id}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    category_id: event.target.value,
                  }))
                }
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">
                {t("amount", locale)}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({
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
                      name="recurring-currency"
                      value={currencyOption}
                      checked={effectiveCurrency === currencyOption}
                      disabled={Boolean(lockedCurrency && lockedCurrency !== currencyOption)}
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">
                {t("description", locale)}
              </label>
              <input
                type="text"
                value={form.description}
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
                {t("start_date", locale)}
              </label>
              <input
                type="date"
                value={form.start_date}
                min={getTodayLocalDate()}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    start_date: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">
              {t("monthly_days", locale)}
            </label>
            <input
              type="text"
              value={form.monthly_days}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  monthly_days: event.target.value,
                }))
              }
              placeholder={t("monthly_days_placeholder", locale)}
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.include_first_day}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    include_first_day: event.target.checked,
                  }))
                }
              />
              {t("first_day", locale)}
            </label>
            <label className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.include_last_day}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    include_last_day: event.target.checked,
                  }))
                }
              />
              {t("last_day", locale)}
            </label>
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error === "load_failed"
                ? t("failed_to_load_transaction_form", locale)
                : t("failed_to_create_recurring_event", locale)}
            </div>
          ) : null}

          {isLoadingData ? (
            <div className="rounded-xl border border-[var(--border)] bg-slate-50 px-4 py-3 text-sm text-[var(--muted)]">
              {t("loading_dashboard", locale)}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {t("cancel", locale)}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={cannotSubmit || isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {isSubmitting
              ? t("creating_recurring_event", locale)
              : t("create_recurring_event", locale)}
          </button>
        </div>
      </div>
    </div>
  );
}
