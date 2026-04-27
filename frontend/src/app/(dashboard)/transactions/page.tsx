"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ClipboardCheck,
  FileDown,
  MoreHorizontal,
  Plus,
  Repeat,
  ScanLine,
  Trash2,
} from "lucide-react";
import Link from "next/link";

import { AddCategoryModal } from "@/components/AddCategoryModal";
import { AddRecurringEventModal } from "@/components/AddRecurringEventModal";
import { AddTransactionModal } from "@/components/AddTransactionModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EditTransactionModal } from "@/components/EditTransactionModal";
import { useLanguage } from "@/context/LanguageContext";
import { generateTransactionPDF } from "@/lib/exportPdf";
import { deleteTransaction, fetchCategories, fetchTransactions } from "@/lib/api";
import { t } from "@/lib/i18n";
import type { Category, Numeric, Transaction } from "@/types";

type StatusFilter = "all" | "confirmed" | "pending";

function toNumber(value: Numeric | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsedValue =
    typeof value === "number" ? value : Number.parseFloat(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatAmount(transaction: Transaction, locale: "en" | "ar") {
  const amount = toNumber(transaction.amount);

  if (transaction.currency === "USD") {
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

function getCategoryLabel(transaction: Transaction, locale: "en" | "ar") {
  if (!transaction.category) {
    return "-";
  }

  return locale === "ar"
    ? transaction.category.name_ar
    : transaction.category.name_en;
}

export default function TransactionsPage() {
  const { locale } = useLanguage();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<{
    status: StatusFilter;
    category_id: string;
    start_date: string;
    end_date: string;
  }>({
    status: "all",
    category_id: "",
    start_date: "",
    end_date: "",
  });
  const [reloadToken, setReloadToken] = useState(0);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isRecurringOpen, setIsRecurringOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPageData() {
      setLoading(true);
      setError(null);

      try {
        const [rows, categoryRows] = await Promise.all([
          fetchTransactions({
            status: filters.status,
            category_id: filters.category_id ? Number(filters.category_id) : undefined,
            start_date: filters.start_date || undefined,
            end_date: filters.end_date || undefined,
          }),
          fetchCategories(),
        ]);

        if (!isMounted) {
          return;
        }

        setTransactions(rows);
        setCategories(categoryRows);
      } catch {
        if (isMounted) {
          setError("load_failed");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadPageData();

    return () => {
      isMounted = false;
    };
  }, [filters, reloadToken]);

  const pendingCount = useMemo(
    () => transactions.filter((transaction) => transaction.status === "pending").length,
    [transactions],
  );

  function handleTransactionCreated(newTransaction: Transaction) {
    setTransactions((currentTransactions) => {
      if (
        (filters.status === "pending" && newTransaction.status !== "pending") ||
        (filters.status === "confirmed" && newTransaction.status !== "confirmed")
      ) {
        return currentTransactions;
      }

      return [
        newTransaction,
        ...currentTransactions.filter(
          (transaction) => transaction.id !== newTransaction.id,
        ),
      ];
    });
  }

  function handleCategoryCreated(category: Category) {
    setCategories((current) => [category, ...current]);
  }

  function handleRecurringCreated() {
    setReloadToken((currentValue) => currentValue + 1);
  }

  function handleExportPdf() {
    if (transactions.length === 0) {
      setNotice(t("export_empty_transactions", locale));
      return;
    }

    generateTransactionPDF(transactions, locale);
  }

  function handleTransactionUpdated(updatedTransaction: Transaction) {
    setNotice(t("transaction_updated", locale));
    setTransactions((currentTransactions) =>
      currentTransactions.map((transaction) =>
        transaction.id === updatedTransaction.id ? updatedTransaction : transaction,
      ),
    );
  }

  async function handleDeleteTransaction() {
    if (!deletingTransaction) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteTransaction(deletingTransaction.id);
      setTransactions((currentTransactions) =>
        currentTransactions.filter(
          (transaction) => transaction.id !== deletingTransaction.id,
        ),
      );
      setNotice(t("transaction_deleted", locale));
      setDeletingTransaction(null);
    } catch {
      setError("delete_failed");
    } finally {
      setIsDeleting(false);
    }
  }

  const statusBadgeClasses = {
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  } as const;

  const filterButtons: StatusFilter[] = ["all", "pending", "confirmed"];

  return (
    <>
      <div className="space-y-5">
        {pendingCount > 0 ? (
          <section className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-900 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-100 p-2 text-amber-700">
                <AlertCircle className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium">
                {t("pending_transactions_banner", locale, {
                  count: pendingCount,
                })}
              </p>
            </div>
            <Link
              href="/transactions/review"
              className="rounded-xl bg-amber-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-800"
            >
              {t("review_pending", locale)}
            </Link>
          </section>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error === "delete_failed"
              ? t("failed_to_delete_transaction", locale)
              : t("failed_to_load_transactions", locale)}
          </div>
        ) : null}

        {notice ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-sm font-medium text-sky-900"
            >
              {t("dismiss", locale)}
            </button>
          </div>
        ) : null}

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {t("transactions", locale)}
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {t("filters", locale)}
                </p>
              </div>

              <div className="hidden flex-wrap gap-2 md:flex">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4" />
                  {t("add_category", locale)}
                </button>
                <button
                  type="button"
                  onClick={() => setIsRecurringOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Repeat className="h-4 w-4" />
                  {t("recurring_events", locale)}
                </button>
                <Link
                  href="/transactions/review"
                  data-tour="review-queue"
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  {t("review_queue", locale)}
                </Link>
                <Link
                  href="/transactions/import"
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <ScanLine className="h-4 w-4" />
                  {t("import_transactions", locale)}
                </Link>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <FileDown className="h-4 w-4" />
                  {t("export_pdf", locale)}
                </button>
                <button
                  type="button"
                  data-tour="add-transaction"
                  onClick={() => setIsAddTransactionOpen(true)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  {t("add_transaction", locale)}
                </button>
              </div>
              <div className="relative flex gap-2 md:hidden">
                <button
                  type="button"
                  data-tour="add-transaction"
                  onClick={() => setIsAddTransactionOpen(true)}
                  className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  {t("add_transaction", locale)}
                </button>
                <button
                  type="button"
                  onClick={() => setIsActionMenuOpen((current) => !current)}
                  className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  aria-label={t("actions", locale)}
                  aria-expanded={isActionMenuOpen}
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
                {isActionMenuOpen ? (
                  <div className="absolute end-0 top-12 z-20 w-64 overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddCategoryOpen(true);
                        setIsActionMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-start text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <Plus className="h-4 w-4" />
                      {t("add_category", locale)}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRecurringOpen(true);
                        setIsActionMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-start text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <Repeat className="h-4 w-4" />
                      {t("recurring_events", locale)}
                    </button>
                    <Link
                      href="/transactions/review"
                      data-tour="review-queue"
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <ClipboardCheck className="h-4 w-4" />
                      {t("review_queue", locale)}
                    </Link>
                    <Link
                      href="/transactions/import"
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <ScanLine className="h-4 w-4" />
                      {t("import_transactions", locale)}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        handleExportPdf();
                        setIsActionMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-start text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <FileDown className="h-4 w-4" />
                      {t("export_pdf", locale)}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--muted)]">
                  {t("filter_from", locale)}
                </label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      start_date: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--muted)]">
                  {t("filter_to", locale)}
                </label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      end_date: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--muted)]">
                  {t("category", locale)}
                </label>
                <select
                  value={filters.category_id}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      category_id: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                >
                  <option value="">{t("all_categories", locale)}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {locale === "ar" ? category.name_ar : category.name_en}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--muted)]">
                  {t("status", locale)}
                </label>
                <div className="flex flex-wrap gap-2">
                  {filterButtons.map((statusValue) => {
                    const isActive = filters.status === statusValue;

                    return (
                      <button
                        key={statusValue}
                        type="button"
                        onClick={() =>
                          setFilters((current) => ({
                            ...current,
                            status: statusValue,
                          }))
                        }
                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                          isActive
                            ? "bg-slate-900 text-white"
                            : "border border-[var(--border)] bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {t(statusValue, locale)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-transparent">
                  {t("clear_filters", locale)}
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setFilters({
                      status: "all",
                      category_id: "",
                      start_date: "",
                      end_date: "",
                    })
                  }
                  className="rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  {t("clear_filters", locale)}
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-slate-50 px-4 py-10 text-center text-sm text-[var(--muted)]">
              {t("loading_dashboard", locale)}
            </div>
          ) : null}

          {!loading && transactions.length > 0 ? (
            <>
              <div className="mt-6 hidden overflow-hidden rounded-2xl border border-[var(--border)] lg:block">
                <table className="min-w-full divide-y divide-[var(--border)]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                        {t("date", locale)}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                        {t("description", locale)}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                        {t("category", locale)}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                        {t("amount", locale)}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                        {t("currency", locale)}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                        {t("status", locale)}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                        {t("actions", locale)}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] bg-white">
                    {transactions.map((transaction) => {
                      const amountTone =
                        transaction.category?.type === "income"
                          ? "text-[var(--success)]"
                          : "text-[var(--danger)]";

                      return (
                        <tr key={transaction.id}>
                          <td className="px-4 py-4 text-sm text-slate-700">
                            {formatDate(transaction.transaction_date, locale)}
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm font-medium text-slate-900">
                              {transaction.description || "-"}
                            </p>
                            <p className="mt-1 text-xs text-[var(--muted)]">
                              {getSourceLabel(transaction.source, locale)}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-700">
                            {getCategoryLabel(transaction, locale)}
                          </td>
                          <td className={`px-4 py-4 text-sm font-semibold ${amountTone}`}>
                            {formatAmount(transaction, locale)}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-700">
                            {transaction.currency}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                                statusBadgeClasses[transaction.status]
                              }`}
                            >
                              {t(transaction.status, locale)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            {transaction.status === "pending" ? (
                              <Link
                                href={`/transactions/review?transactionId=${transaction.id}`}
                                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                              >
                                {t("review_pending", locale)}
                              </Link>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingTransaction(transaction)}
                                  className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                  {t("edit_transaction", locale)}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingTransaction(transaction)}
                                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                                >
                                  {t("delete_transaction", locale)}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 grid gap-4 lg:hidden">
                {transactions.map((transaction) => {
                  const amountTone =
                    transaction.category?.type === "income"
                      ? "text-[var(--success)]"
                      : "text-[var(--danger)]";

                  return (
                    <article
                      key={transaction.id}
                      className="rounded-2xl border border-[var(--border)] bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {transaction.description || "-"}
                          </p>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {formatDate(transaction.transaction_date, locale)}
                          </p>
                        </div>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                            statusBadgeClasses[transaction.status]
                          }`}
                        >
                          {t(transaction.status, locale)}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                            {t("category", locale)}
                          </p>
                          <p className="mt-1 text-sm text-slate-800">
                            {getCategoryLabel(transaction, locale)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                            {t("source", locale)}
                          </p>
                          <p className="mt-1 text-sm text-slate-800">
                            {getSourceLabel(transaction.source, locale)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                            {t("amount", locale)}
                          </p>
                          <p className={`mt-1 text-sm font-semibold ${amountTone}`}>
                            {formatAmount(transaction, locale)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                            {t("currency", locale)}
                          </p>
                          <p className="mt-1 text-sm text-slate-800">
                            {transaction.currency}
                          </p>
                        </div>
                      </div>

                      {transaction.status === "pending" ? (
                        <div className="mt-4">
                          <Link
                            href={`/transactions/review?transactionId=${transaction.id}`}
                            className="inline-flex w-full justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                          >
                            {t("review_pending", locale)}
                          </Link>
                        </div>
                      ) : (
                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingTransaction(transaction)}
                            className="flex-1 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            {t("edit_transaction", locale)}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingTransaction(transaction)}
                            className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                            aria-label={t("delete_transaction", locale)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          ) : null}

          {!loading && transactions.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-slate-50 px-4 py-10 text-center text-sm text-[var(--muted)]">
              {t("no_transactions_found", locale)}
            </div>
          ) : null}
        </section>
      </div>

      <AddTransactionModal
        isOpen={isAddTransactionOpen}
        onClose={() => setIsAddTransactionOpen(false)}
        onCreated={handleTransactionCreated}
      />
      <AddRecurringEventModal
        isOpen={isRecurringOpen}
        onClose={() => setIsRecurringOpen(false)}
        onCreated={() => {
          setIsRecurringOpen(false);
          handleRecurringCreated();
        }}
      />
      <AddCategoryModal
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        onCreated={handleCategoryCreated}
      />
      <EditTransactionModal
        isOpen={Boolean(editingTransaction)}
        transaction={editingTransaction}
        categories={categories}
        locale={locale}
        onClose={() => setEditingTransaction(null)}
        onUpdated={handleTransactionUpdated}
      />
      <ConfirmDialog
        isOpen={Boolean(deletingTransaction)}
        title={t("delete_transaction_title", locale)}
        description={t("delete_transaction_description", locale)}
        confirmLabel={t("delete_transaction", locale)}
        cancelLabel={t("cancel", locale)}
        tone="danger"
        isSubmitting={isDeleting}
        onCancel={() => setDeletingTransaction(null)}
        onConfirm={() => void handleDeleteTransaction()}
      />
    </>
  );
}
