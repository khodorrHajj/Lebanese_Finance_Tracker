"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useLanguage } from "@/context/LanguageContext";
import {
  deleteWallet,
  fetchCategories,
  fetchTransactions,
  fetchWallet,
} from "@/lib/api";
import { t } from "@/lib/i18n";
import { getWalletTypeLabel } from "@/lib/walletLabels";
import type { Category, Institution, Numeric, Transaction } from "@/types";

type StatusFilter = "all" | "confirmed" | "pending";

function toNumber(value: Numeric | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsedValue =
    typeof value === "number" ? value : Number.parseFloat(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatWalletBalance(wallet: Institution, locale: "en" | "ar") {
  const amount = toNumber(wallet.current_balance);

  if (wallet.card_type === "Cash_LBP") {
    const formatted = new Intl.NumberFormat(
      locale === "ar" ? "ar-LB" : "en-US",
      { maximumFractionDigits: 0 },
    ).format(amount);
    return locale === "ar" ? `${formatted} ل.ل` : `${formatted} LBP`;
  }

  return new Intl.NumberFormat(locale === "ar" ? "ar-LB" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
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

function getCategoryLabel(transaction: Transaction, locale: "en" | "ar") {
  if (!transaction.category) {
    return "-";
  }

  return locale === "ar"
    ? transaction.category.name_ar
    : transaction.category.name_en;
}

export default function WalletDetailsPage() {
  const params = useParams<{ walletId: string }>();
  const router = useRouter();
  const { locale } = useLanguage();
  const walletId = Number(params.walletId);
  const isValidWalletId = Number.isFinite(walletId);

  const [wallet, setWallet] = useState<Institution | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(isValidWalletId);
  const [error, setError] = useState<string | null>(
    isValidWalletId ? null : "wallet_not_found",
  );
  const [isRemoving, setIsRemoving] = useState(false);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: "all" as StatusFilter,
    category_id: "",
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    if (!isValidWalletId) {
      return;
    }

    let isMounted = true;

    async function loadWalletPage() {
      setLoading(true);
      setError(null);

      try {
        const [walletRow, transactionRows, categoryRows] = await Promise.all([
          fetchWallet(walletId),
          fetchTransactions({
            institution_id: walletId,
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

        setWallet(walletRow);
        setTransactions(transactionRows);
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

    void loadWalletPage();

    return () => {
      isMounted = false;
    };
  }, [
    filters.category_id,
    filters.end_date,
    filters.start_date,
    filters.status,
    isValidWalletId,
    walletId,
  ]);

  const credits = useMemo(() => {
    const useNativeLbp = wallet?.card_type === "Cash_LBP";
    return transactions
      .filter((transaction) => transaction.category?.type === "income")
      .reduce(
        (sum, transaction) =>
          sum +
          toNumber(
            useNativeLbp ? transaction.amount : transaction.usd_equivalent,
          ),
        0,
      );
  }, [transactions, wallet?.card_type]);

  const debits = useMemo(() => {
    const useNativeLbp = wallet?.card_type === "Cash_LBP";
    return transactions
      .filter((transaction) => transaction.category?.type === "expense")
      .reduce(
        (sum, transaction) =>
          sum +
          toNumber(
            useNativeLbp ? transaction.amount : transaction.usd_equivalent,
          ),
        0,
      );
  }, [transactions, wallet?.card_type]);

  async function handleRemoveWallet() {
    if (!wallet) {
      return;
    }

    setIsRemoving(true);

    try {
      await deleteWallet(wallet.id);
      router.replace("/wallets");
    } catch {
      setError("delete_failed");
      setIsRemoving(false);
    }
  }

  const statusBadgeClasses = {
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  } as const;

  const filterButtons: StatusFilter[] = ["all", "pending", "confirmed"];

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href="/wallets"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("wallets", locale)}
            </Link>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900">
              {wallet?.name ?? t("wallet_history", locale)}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {t("wallet_overview", locale)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsRemoveConfirmOpen(true)}
            disabled={!wallet || isRemoving}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Trash2 className="h-4 w-4" />
            {isRemoving ? t("removing_wallet", locale) : t("remove_wallet", locale)}
          </button>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error === "delete_failed"
              ? t("failed_to_delete_wallet", locale)
              : error === "wallet_not_found"
                ? t("wallet_not_found", locale)
                : t("failed_to_load_wallets", locale)}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-slate-50 px-4 py-10 text-center text-sm text-[var(--muted)]">
            {t("loading_dashboard", locale)}
          </div>
        ) : null}

        {!loading && wallet ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-[var(--border)] bg-white p-5">
              <p className="text-sm font-medium text-[var(--muted)]">
                {t("current_balance", locale)}
              </p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {formatWalletBalance(wallet, locale)}
              </p>
            </article>
            <article className="rounded-2xl border border-[var(--border)] bg-white p-5">
              <p className="text-sm font-medium text-[var(--muted)]">
                {t("credits", locale)}
              </p>
              <p className="mt-3 text-2xl font-semibold text-emerald-700">
                {wallet.card_type === "Cash_LBP"
                  ? `${new Intl.NumberFormat(locale === "ar" ? "ar-LB" : "en-US", { maximumFractionDigits: 0 }).format(credits)} ${locale === "ar" ? "ل.ل" : "LBP"}`
                  : new Intl.NumberFormat(locale === "ar" ? "ar-LB" : "en-US", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 2,
                    }).format(credits)}
              </p>
            </article>
            <article className="rounded-2xl border border-[var(--border)] bg-white p-5">
              <p className="text-sm font-medium text-[var(--muted)]">
                {t("debits", locale)}
              </p>
              <p className="mt-3 text-2xl font-semibold text-rose-700">
                {wallet.card_type === "Cash_LBP"
                  ? `${new Intl.NumberFormat(locale === "ar" ? "ar-LB" : "en-US", { maximumFractionDigits: 0 }).format(debits)} ${locale === "ar" ? "ل.ل" : "LBP"}`
                  : new Intl.NumberFormat(locale === "ar" ? "ar-LB" : "en-US", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 2,
                    }).format(debits)}
              </p>
            </article>
            <article className="rounded-2xl border border-[var(--border)] bg-white p-5">
              <p className="text-sm font-medium text-[var(--muted)]">
                {t("wallet_card_type", locale)}
              </p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {getWalletTypeLabel(wallet.card_type, locale)}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {t("last_four_digits", locale)}: {wallet.last_four_digits || "-"}
              </p>
            </article>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {t("wallet_transactions", locale)}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {t("filters", locale)}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
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

            <div className="flex flex-wrap gap-2 xl:col-span-2">
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
        </div>

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
                      {t("status", locale)}
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
                        <td className="px-4 py-4 text-sm font-medium text-slate-900">
                          {transaction.description || "-"}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-700">
                          {getCategoryLabel(transaction, locale)}
                        </td>
                        <td className={`px-4 py-4 text-sm font-semibold ${amountTone}`}>
                          {formatAmount(transaction, locale)}
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
                          {t("amount", locale)}
                        </p>
                        <p className={`mt-1 text-sm font-semibold ${amountTone}`}>
                          {formatAmount(transaction, locale)}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        ) : null}

        {!loading && transactions.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-slate-50 px-4 py-10 text-center text-sm text-[var(--muted)]">
            {t("no_wallet_transactions", locale)}
          </div>
        ) : null}
      </section>
      <ConfirmDialog
        isOpen={isRemoveConfirmOpen}
        title={t("remove_wallet_confirm_title", locale)}
        description={t("remove_wallet_confirm_description", locale)}
        confirmLabel={t("remove_wallet", locale)}
        cancelLabel={t("cancel", locale)}
        tone="danger"
        isSubmitting={isRemoving}
        onCancel={() => setIsRemoveConfirmOpen(false)}
        onConfirm={() => void handleRemoveWallet()}
      />
    </div>
  );
}
