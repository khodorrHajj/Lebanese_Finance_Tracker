"use client";

import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { TwoFactorModal } from "@/components/TwoFactorModal";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { getGoogleAuthURL } from "@/lib/api";
import { t } from "@/lib/i18n";

export function LoginPageClient({ registered }: { registered: boolean }) {
  const router = useRouter();
  const { locale } = useLanguage();
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);
    setErrorDetail(null);
    setFieldErrors({});

    try {
      const response = await login(email, password);

      if (response.requires_2fa && response.temp_token) {
        setTempToken(response.temp_token);
        return;
      }

      router.replace("/dashboard");
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 403 &&
        error.response?.data?.detail === "Email verification required"
      ) {
        setError("email_verification_required");
      } else if (axios.isAxiosError(error) && error.response?.status === 401) {
        setFieldErrors({
          email: t("login_credentials_invalid", locale),
          password: t("login_credentials_invalid", locale),
        });
      } else {
        setError("login_failed");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setIsGoogleLoading(true);
    setError(null);
    setErrorDetail(null);

    try {
      const response = await getGoogleAuthURL();
      window.location.href = response.url;
    } catch (caughtError) {
      if (axios.isAxiosError(caughtError) && typeof caughtError.response?.data?.detail === "string") {
        setErrorDetail(caughtError.response.data.detail);
      }
      setError("login_failed");
      setIsGoogleLoading(false);
    }
  }

  if (loading || user) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-slate-700" />
        <p className="text-sm text-[var(--muted)]">{t("checking_session", locale)}</p>
      </div>
    );
  }

  return (
    <>
      <section className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-[var(--muted)]">
          {t("auth_welcome", locale)}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">
          {t("login", locale)}
        </h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          {t("sign_in_to_continue", locale)}
        </p>

        {registered ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {t("registration_success", locale)}
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error === "email_verification_required"
              ? t("login_requires_verified_email", locale)
              : errorDetail ?? t("failed_to_login", locale)}
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">
              {t("email", locale)}
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
            {fieldErrors.email ? (
              <p className="text-sm text-rose-700">{fieldErrors.email}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">
              {t("password", locale)}
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
            {fieldErrors.password ? (
              <p className="text-sm text-rose-700">{fieldErrors.password}</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!email || !password || isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? t("logging_in", locale) : t("login", locale)}
          </button>

          <button
            type="button"
            onClick={() => void handleGoogleLogin()}
            disabled={isGoogleLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            {isGoogleLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {t("login_with_google", locale)}
          </button>
        </div>

        <p className="mt-6 text-sm text-[var(--muted)]">
          <Link href="/forgot-password" className="font-medium text-slate-900 underline">
            {t("forgot_password", locale)}
          </Link>
        </p>

        <p className="mt-4 text-sm text-[var(--muted)]">
          {t("no_account_yet", locale)}{" "}
          <Link href="/register" className="font-medium text-slate-900 underline">
            {t("register", locale)}
          </Link>
        </p>
      </section>

      <TwoFactorModal
        isOpen={Boolean(tempToken)}
        tempToken={tempToken}
        onClose={() => setTempToken(null)}
      />
    </>
  );
}
