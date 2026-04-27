"use client";

import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  CheckCircle2,
  CircleDashed,
  Plus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { AddCategoryModal } from "@/components/AddCategoryModal";
import { AddTransactionModal } from "@/components/AddTransactionModal";
import { AddWalletModal } from "@/components/AddWalletModal";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  fetchCategories,
  fetchForecast,
  fetchLatestRate,
  fetchNetWorth,
  fetchTransactions,
  fetchWallets,
  resendEmailVerificationForEmail,
  verifyEmail,
} from "@/lib/api";
import { t } from "@/lib/i18n";
import { getWalletTypeLabel } from "@/lib/walletLabels";
import type {
  Category,
  ForecastData,
  Institution,
  NetWorthData,
  Numeric,
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
function formatUsd(value: Numeric | null | undefined, locale: "en" | "ar") {
  return new Intl.NumberFormat(locale === "ar" ? "ar-LB" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatLbp(value: Numeric | null | undefined, locale: "en" | "ar") {
  const formatted = new Intl.NumberFormat(locale === "ar" ? "ar-LB" : "en-US", {
    maximumFractionDigits: 0,
  }).format(toNumber(value));

  return locale === "ar" ? `${formatted} ل.ل` : `${formatted} LBP`;
}

function formatRelativeUpdate(timestamp: string | null, locale: "en" | "ar") {
  if (!timestamp) {
    return "-";
  }

  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000),
  );

  if (minutes < 1) {
    return t("updated_just_now", locale);
  }

  if (minutes < 60) {
    return t("updated_minutes_ago", locale, { count: minutes });
  }

  return t("updated_hours_ago", locale, {
    count: Math.floor(minutes / 60),
  });
}

function formatDate(value: string, locale: "en" | "ar") {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-LB" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function getTodayLocalDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

function formatRefreshTime(timestamp: string | null, locale: "en" | "ar") {
  if (!timestamp) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale === "ar" ? "ar-LB" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function applyLatestRateToNetWorth(
  current: NetWorthData | null,
  latestRate: { rate: Numeric | null; rate_timestamp: string | null },
) {
  if (!current) {
    return current;
  }

  const nextRate = toNumber(latestRate.rate);
  const totalLbp = toNumber(current.total_lbp);
  const totalUsd = toNumber(current.total_usd);
  const lbpInUsd = nextRate > 0 ? totalLbp / nextRate : 0;

  return {
    ...current,
    latest_rate: latestRate.rate ?? current.latest_rate,
    rate_timestamp: latestRate.rate_timestamp ?? current.rate_timestamp,
    total_net_worth_usd: totalUsd + lbpInUsd,
  };
}

const RATE_REFRESH_TIME_STORAGE_KEY = "liratrack_last_rate_refresh_time";

function DashboardCard({
  title,
  value,
  tone = "default",
  icon,
  subtitle,
  onIconClick,
  iconLabel,
}: {
  title: string;
  value: string;
  tone?: "default" | "success" | "danger";
  icon: ReactNode;
  subtitle?: string;
  onIconClick?: () => void;
  iconLabel?: string;
}) {
  const toneClass =
    tone === "success"
      ? "text-[var(--success)]"
      : tone === "danger"
        ? "text-[var(--danger)]"
        : "text-slate-900";

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--muted)]">{title}</p>
        {onIconClick ? (
          <button
            type="button"
            onClick={onIconClick}
            className="rounded-xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
            aria-label={iconLabel ?? title}
          >
            {icon}
          </button>
        ) : (
          <div className="rounded-xl bg-slate-100 p-2 text-slate-600">{icon}</div>
        )}
      </div>
      <p className={`mt-6 text-3xl font-semibold tracking-tight ${toneClass}`}>
        {value}
      </p>
      {subtitle ? (
        <p className="mt-2 text-sm text-[var(--muted)]">{subtitle}</p>
      ) : null}
    </section>
  );
}
export default function DashboardPage() {
  const router = useRouter();
  const { locale } = useLanguage();
  const { user, refreshUser, setUserProfile } = useAuth();
  const hasRecordedInitialRateRefresh = useRef(false);
  const [netWorth, setNetWorth] = useState<NetWorthData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [wallets, setWallets] = useState<Institution[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verificationOtp, setVerificationOtp] = useState("");
  const [verificationState, setVerificationState] = useState<string | null>(null);
  const [verificationRetryAfterSeconds, setVerificationRetryAfterSeconds] = useState(0);
  const [isRefreshingRate, setIsRefreshingRate] = useState(false);
  const [lastRateRefreshTime, setLastRateRefreshTime] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem(RATE_REFRESH_TIME_STORAGE_KEY);
  });
  const [reloadToken, setReloadToken] = useState(0);
  const [isAddWalletOpen, setIsAddWalletOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [recentFilters, setRecentFilters] = useState({
    start_date: "",
    end_date: "",
    category_id: "",
  });

  function persistRateRefreshTime(timestamp: string) {
    setLastRateRefreshTime(timestamp);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(RATE_REFRESH_TIME_STORAGE_KEY, timestamp);
    }
  }

  useEffect(() => {
    let isMounted = true;
    const maxAllowedDate = getTodayLocalDate();

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        const [
          netWorthData,
          forecastData,
          latestRateData,
          categoryRows,
          walletRows,
          transactionRows,
        ] =
          await Promise.all([
            fetchNetWorth(),
            fetchForecast(),
            fetchLatestRate().catch(() => null),
            fetchCategories(),
            fetchWallets(),
            fetchTransactions({
              status: "all",
              start_date:
                recentFilters.start_date && recentFilters.start_date <= maxAllowedDate
                  ? recentFilters.start_date
                  : undefined,
              end_date:
                recentFilters.end_date && recentFilters.end_date <= maxAllowedDate
                  ? recentFilters.end_date
                  : undefined,
              category_id: recentFilters.category_id
                ? Number(recentFilters.category_id)
                : undefined,
              page_size: 5,
            }),
          ]);

        if (!isMounted) {
          return;
        }

        setNetWorth({
          ...netWorthData,
          latest_rate: latestRateData?.rate ?? netWorthData.latest_rate,
          rate_timestamp: latestRateData?.rate_timestamp ?? netWorthData.rate_timestamp,
        });
        if (latestRateData && !hasRecordedInitialRateRefresh.current) {
          hasRecordedInitialRateRefresh.current = true;
          persistRateRefreshTime(new Date().toISOString());
        }
        setForecast(forecastData);
        setCategories(categoryRows);
        setWallets(walletRows);
        setRecentTransactions(transactionRows);
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

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [recentFilters.end_date, recentFilters.category_id, recentFilters.start_date, reloadToken]);

  useEffect(() => {
    if (verificationRetryAfterSeconds <= 0) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setVerificationRetryAfterSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timerId);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [verificationRetryAfterSeconds]);

  const projectedSavings = useMemo(() => {
    return toNumber(forecast?.projected_savings);
  }, [forecast?.projected_savings]);

  const moneyViewLabels = useMemo(
    () => ({
      usdWalletsTotal: t("usd_wallets_total", locale),
      lbpWalletsTotal: t("lbp_wallets_total", locale),
      netWorthUsd: t("net_worth_usd", locale),
      rateUsed: t("rate_used", locale),
      usdWalletsSubtitle: t("native_usd_balances_only", locale),
      lbpWalletsSubtitle: t("native_lbp_balances_only", locale),
      netWorthSubtitle: t("all_wallets_converted_usd", locale),
      rateUsedSubtitle: t("applied_to_lbp_conversion", locale),
    }),
    [locale],
  );

  const onboardingState = useMemo(() => {
    const hasWallets = wallets.length > 0;
    const hasCategories = categories.length > 0;
    const hasTransactions = recentTransactions.length > 0;

    return {
      hasWallets,
      hasCategories,
      hasTransactions,
      isComplete: hasWallets && hasCategories && hasTransactions,
    };
  }, [wallets, categories, recentTransactions]);

  const maxRecentDate = getTodayLocalDate();

  function formatRetryAfter(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes === 0) {
      return `${seconds}s`;
    }

    if (remainingSeconds === 0) {
      return `${minutes}m`;
    }

    return `${minutes}m ${remainingSeconds}s`;
  }

  const walletCards = useMemo(() => {
    const latestRate = toNumber(netWorth?.latest_rate);

    return wallets.map((wallet) => {
      const isLbpWallet = wallet.card_type === "Cash_LBP";
      const nativeBalance = isLbpWallet
        ? formatLbp(wallet.current_balance, locale)
        : formatUsd(wallet.current_balance, locale);

      const subtitle =
        isLbpWallet && latestRate > 0
          ? t("approx_usd_value", locale, {
              amount: formatUsd(toNumber(wallet.current_balance) / latestRate, locale),
            })
          : t("included_in_total_net_worth", locale);

      return {
        ...wallet,
        nativeBalance,
        subtitle,
      };
    });
  }, [locale, netWorth?.latest_rate, wallets]);

  async function handleVerifyEmail() {
    setVerificationState(null);

    try {
      await verifyEmail({
        email: user?.email ?? "",
        otp: verificationOtp,
      });
      const updatedProfile = await refreshUser();
      setUserProfile(updatedProfile);
      setVerificationOtp("");
      setVerificationState("verified");
    } catch {
      setVerificationState("error");
    }
  }

  async function handleResendVerification() {
    setVerificationState(null);

    try {
      const response = await resendEmailVerificationForEmail(user?.email ?? "");
      setVerificationRetryAfterSeconds(response.retry_after_seconds ?? 0);
      const updatedProfile = await refreshUser();
      setUserProfile(updatedProfile);
      setVerificationState("resent");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data as
          | { detail?: string | { message?: string; retry_after_seconds?: number } }
          | undefined;

        const retryAfterSeconds =
          typeof detail?.detail === "object" && detail.detail
            ? Number(detail.detail.retry_after_seconds ?? 0)
            : 0;

        if (retryAfterSeconds > 0) {
          setVerificationRetryAfterSeconds(retryAfterSeconds);
          setVerificationState("cooldown");
          return;
        }

        if (
          error.response?.status === 503 ||
          error.response?.status === 502
        ) {
          setVerificationState("delivery_error");
          return;
        }
      }

      setVerificationState("error");
    }
  }

  async function handleRefreshRate() {
    setIsRefreshingRate(true);

    try {
      const latestRateData = await fetchLatestRate();
      setNetWorth((current) => applyLatestRateToNetWorth(current, latestRateData));
      persistRateRefreshTime(new Date().toISOString());
    } catch {
      setError("load_failed");
    } finally {
      setIsRefreshingRate(false);
    }
  }

  function handleRecentDateChange(field: "start_date" | "end_date", value: string) {
    const nextValue = value && value > maxRecentDate ? maxRecentDate : value;

    setRecentFilters((current) => ({
      ...current,
      [field]: nextValue,
    }));
  }

  function refreshDashboardData() {
    setReloadToken((current) => current + 1);
  }

  const rateStatusSource = lastRateRefreshTime ?? netWorth?.rate_timestamp ?? null;
  const rateStatusRelative = formatRelativeUpdate(rateStatusSource, locale);
  const rateStatusText = rateStatusSource
    ? t("refreshed_from", locale, {
        time: formatRefreshTime(rateStatusSource, locale),
      })
    : "-";

  function startGuidedTour() {
    window.dispatchEvent(new Event("liratrack:start-tour"));
  }

  return (
    <>
    <div className="space-y-6">
      {!user?.email_verified ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-amber-950">
            {t("verify_your_email", locale)}
          </h2>
          <p className="mt-2 text-sm text-amber-900">
            {t("verify_email_notice", locale)}
          </p>
          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={verificationOtp}
              onChange={(event) =>
                setVerificationOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="123456"
              className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-500"
            />
            <button
              type="button"
              onClick={() => void handleVerifyEmail()}
              disabled={verificationOtp.length !== 6}
              className="rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-amber-300"
            >
              {t("verify_email", locale)}
            </button>
            <button
              type="button"
              onClick={() => void handleResendVerification()}
              disabled={verificationRetryAfterSeconds > 0}
              className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-medium text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:bg-amber-100/60 disabled:text-amber-700"
            >
              {verificationRetryAfterSeconds > 0
                ? t("resend_verification_code_in", locale, {
                    time: formatRetryAfter(verificationRetryAfterSeconds),
                  })
                : t("resend_code", locale)}
            </button>
          </div>
          {verificationState ? (
            <p className="mt-3 text-sm text-amber-900">
              {verificationState === "verified"
                ? t("email_verified_success", locale)
                : verificationState === "resent"
                  ? t("verification_code_resent", locale)
                  : verificationState === "cooldown"
                    ? t("verification_code_resend_wait", locale, {
                        time: formatRetryAfter(verificationRetryAfterSeconds),
                      })
                    : verificationState === "delivery_error"
                      ? t("verification_delivery_failed", locale)
                      : t("verification_failed", locale)}
            </p>
          ) : null}
        </section>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("unable_to_load_dashboard", locale)}
        </div>
      ) : null}

      {!loading && !onboardingState.isComplete ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--muted)]">
                {t("getting_started", locale)}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                {t("finish_setting_up_account", locale)}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
                {t("finish_setting_up_account_description", locale)}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:items-center">
              <button
                type="button"
                onClick={startGuidedTour}
                className="rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {t("start_guided_tour", locale)}
              </button>
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700">
                {[
                  onboardingState.hasWallets,
                  onboardingState.hasCategories,
                  onboardingState.hasTransactions,
                ].filter(Boolean).length}
                /3
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            <article className="rounded-2xl border border-[var(--border)] bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {t("add_first_wallet_step", locale)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {t("add_first_wallet_step_description", locale)}
                  </p>
                </div>
                {onboardingState.hasWallets ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <CircleDashed className="h-5 w-5 text-slate-400" />
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsAddWalletOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                {onboardingState.hasWallets
                  ? t("add_another_wallet", locale)
                  : t("add_wallet", locale)}
              </button>
            </article>

            <article className="rounded-2xl border border-[var(--border)] bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {t("create_first_categories_step", locale)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {t("create_first_categories_step_description", locale)}
                  </p>
                </div>
                {onboardingState.hasCategories ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <CircleDashed className="h-5 w-5 text-slate-400" />
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsAddCategoryOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <Plus className="h-4 w-4" />
                {onboardingState.hasCategories
                  ? t("add_another_category", locale)
                  : t("add_category", locale)}
              </button>
            </article>

            <article className="rounded-2xl border border-[var(--border)] bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {t("record_first_transaction_step", locale)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {t("record_first_transaction_step_description", locale)}
                  </p>
                </div>
                {onboardingState.hasTransactions ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <CircleDashed className="h-5 w-5 text-slate-400" />
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsAddTransactionOpen(true)}
                disabled={!onboardingState.hasWallets || !onboardingState.hasCategories}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                <Plus className="h-4 w-4" />
                {onboardingState.hasTransactions
                  ? t("add_another_transaction", locale)
                  : t("add_transaction", locale)}
              </button>
              {!onboardingState.hasWallets || !onboardingState.hasCategories ? (
                <p className="mt-3 text-xs text-[var(--muted)]">
                  {t("finish_wallet_and_category_first", locale)}
                </p>
              ) : null}
            </article>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          title={moneyViewLabels.usdWalletsTotal}
          value={
            loading
              ? t("loading_dashboard", locale)
              : formatUsd(netWorth?.total_usd, locale)
          }
          tone={toNumber(netWorth?.total_usd) >= 0 ? "success" : "danger"}
          icon={<Wallet className="h-5 w-5" />}
          subtitle={moneyViewLabels.usdWalletsSubtitle}
          onIconClick={() => router.push("/wallets")}
          iconLabel={t("wallets", locale)}
        />
        <DashboardCard
          title={moneyViewLabels.lbpWalletsTotal}
          value={
            loading
              ? t("loading_dashboard", locale)
              : formatLbp(netWorth?.total_lbp, locale)
          }
          tone={toNumber(netWorth?.total_lbp) >= 0 ? "success" : "danger"}
          icon={<Wallet className="h-5 w-5" />}
          subtitle={moneyViewLabels.lbpWalletsSubtitle}
          onIconClick={() => router.push("/wallets")}
          iconLabel={t("wallets", locale)}
        />
        <DashboardCard
          title={moneyViewLabels.netWorthUsd}
          value={
            loading
              ? t("loading_dashboard", locale)
              : formatUsd(netWorth?.total_net_worth_usd, locale)
          }
          tone={toNumber(netWorth?.total_net_worth_usd) >= 0 ? "success" : "danger"}
          icon={<Wallet className="h-5 w-5" />}
          subtitle={moneyViewLabels.netWorthSubtitle}
          onIconClick={() => router.push("/wallets")}
          iconLabel={t("wallets", locale)}
        />
        <DashboardCard
          title={moneyViewLabels.rateUsed}
          value={
            loading
              ? t("loading_dashboard", locale)
              : netWorth?.latest_rate
                ? formatLbp(netWorth.latest_rate, locale)
                : t("rate_unavailable", locale)
          }
          icon={
            <RefreshCw
              className={`h-5 w-5 ${isRefreshingRate ? "animate-spin" : ""}`}
            />
          }
          subtitle={
            loading
              ? moneyViewLabels.rateUsedSubtitle
              : `${moneyViewLabels.rateUsedSubtitle} - ${rateStatusText} (${rateStatusRelative})`
          }
          onIconClick={() => void handleRefreshRate()}
          iconLabel={t("refresh_rate", locale)}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <DashboardCard
          title={t("projected_savings", locale)}
          value={
            loading
              ? t("loading_dashboard", locale)
              : formatUsd(forecast?.projected_savings, locale)
          }
          tone={
            projectedSavings > 0
              ? "success"
              : projectedSavings < 0
                ? "danger"
                : "default"
          }
          icon={
            projectedSavings < 0 ? (
              <TrendingDown className="h-5 w-5" />
            ) : (
              <TrendingUp className="h-5 w-5" />
            )
          }
        />
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--muted)]">
              {t("wallet_balances", locale)}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              {t("wallets", locale)}
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {t("wallet_balances_description", locale)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/wallets")}
            className="rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {t("wallets", locale)}
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-slate-50 px-4 py-10 text-center text-sm text-[var(--muted)] md:col-span-2 xl:col-span-3">
              {t("loading_dashboard", locale)}
            </div>
          ) : null}

          {!loading && walletCards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-slate-50 px-4 py-10 text-center text-sm text-[var(--muted)] md:col-span-2 xl:col-span-3">
              {t("no_wallets_found", locale)}
            </div>
          ) : null}

          {!loading
            ? walletCards.map((wallet) => (
                <article
                  key={wallet.id}
                  className="rounded-2xl border border-[var(--border)] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {wallet.name}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {getWalletTypeLabel(wallet.card_type, locale)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
                      <Wallet className="h-5 w-5" />
                    </div>
                  </div>

                  <p className="mt-5 text-2xl font-semibold text-slate-900">
                    {wallet.nativeBalance}
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {wallet.subtitle}
                  </p>
                </article>
              ))
            : null}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--muted)]">
              {t("recent_transactions", locale)}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              {t("recent_activity", locale)}
            </h2>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <input
              type="date"
              value={recentFilters.start_date}
              max={maxRecentDate}
              onChange={(event) =>
                handleRecentDateChange("start_date", event.target.value)
              }
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
            <input
              type="date"
              value={recentFilters.end_date}
              max={maxRecentDate}
              onChange={(event) =>
                handleRecentDateChange("end_date", event.target.value)
              }
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
            <select
              value={recentFilters.category_id}
              onChange={(event) =>
                setRecentFilters((current) => ({
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
        </div>

        <div className="mt-6 space-y-3">
          {recentTransactions.length === 0 && !loading ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-slate-50 px-4 py-10 text-center text-sm text-[var(--muted)]">
              {t("no_transactions_found", locale)}
            </div>
          ) : null}

          {recentTransactions.map((transaction) => (
            <article
              key={transaction.id}
              className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {transaction.description || t("no_description", locale)}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {transaction.category
                    ? locale === "ar"
                      ? transaction.category.name_ar
                      : transaction.category.name_en
                    : t("uncategorized", locale)}
                </p>
              </div>

              <div className="text-sm text-slate-700 md:text-right">
                <p>{formatDate(transaction.transaction_date, locale)}</p>
                <p className="mt-1 font-semibold">
                  {transaction.currency === "USD"
                    ? formatUsd(transaction.amount, locale)
                    : formatLbp(transaction.amount, locale)}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
      <AddWalletModal
        isOpen={isAddWalletOpen}
        onClose={() => setIsAddWalletOpen(false)}
        onCreated={() => {
          setIsAddWalletOpen(false);
          refreshDashboardData();
        }}
      />
      <AddCategoryModal
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        onCreated={() => {
          setIsAddCategoryOpen(false);
          refreshDashboardData();
        }}
      />
      <AddTransactionModal
        isOpen={isAddTransactionOpen}
        onClose={() => setIsAddTransactionOpen(false)}
        onCreated={() => {
          setIsAddTransactionOpen(false);
          refreshDashboardData();
        }}
      />
    </>
  );
}
