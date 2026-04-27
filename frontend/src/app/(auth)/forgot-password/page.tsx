"use client";

import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  requestPasswordReset,
  resendPasswordResetCode,
  resetPassword,
} from "@/lib/api";
import { t } from "@/lib/i18n";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { locale } = useLanguage();
  const { completeSession } = useAuth();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);

  useEffect(() => {
    if (retryAfterSeconds <= 0) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setRetryAfterSeconds((current) => {
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
  }, [retryAfterSeconds]);

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

  async function handleRequestOtp() {
    setLoading(true);
    setStatus(null);

    try {
      const response = await requestPasswordReset({ email });
      setStep("reset");
      setStatus("otp_sent");
      setRetryAfterSeconds(response.retry_after_seconds);
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    setLoading(true);
    setStatus(null);

    try {
      const response = await resendPasswordResetCode({ email });
      setStatus("otp_resent");
      setRetryAfterSeconds(response.retry_after_seconds);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const nextRetryAfter = Number(
          (error.response?.data as { detail?: { retry_after_seconds?: number } })?.detail
            ?.retry_after_seconds ?? 0,
        );

        if (nextRetryAfter > 0) {
          setRetryAfterSeconds(nextRetryAfter);
          setStatus("cooldown");
        } else {
          setStatus("error");
        }
      } else {
        setStatus("error");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (newPassword.length < 8) {
      setStatus("short");
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus("mismatch");
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const tokens = await resetPassword({
        email,
        otp,
        new_password: newPassword,
      });
      await completeSession(tokens);
      router.replace("/dashboard");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (
          error.response?.status === 400 &&
          error.response?.data?.detail === "New password must be different from the current password"
        ) {
          setStatus("same_password");
        } else if (error.response?.data?.detail === "Invalid or expired OTP") {
          setStatus("invalid_otp");
        } else if (error.response?.data?.detail === "Invalid OTP") {
          setStatus("invalid_otp");
        } else if (error.response?.data?.detail === "OTP expired") {
          setStatus("expired_otp");
        } else {
          setStatus("error");
        }
      } else {
        setStatus("error");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-white p-8 shadow-sm">
      <p className="text-sm font-medium text-[var(--muted)]">
        {t("forgot_password", locale)}
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-900">
        {step === "request" ? t("request_reset_code", locale) : t("reset_password", locale)}
      </h1>

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
        </div>

        {step === "reset" ? (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">
                {t("otp_code", locale)}
              </label>
              <input
                type="text"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                autoComplete="one-time-code"
                className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">
                {t("new_password", locale)}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">
                {t("confirm_new_password", locale)}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </div>
          </>
        ) : null}

        {status ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {status === "otp_sent" || status === "otp_resent"
              ? t("reset_code_email_sent", locale)
              : status === "cooldown"
                ? t("reset_code_resend_wait", locale, {
                    time: formatRetryAfter(retryAfterSeconds),
                  })
              : status === "short"
                ? t("password_too_short", locale)
              : status === "mismatch"
                ? t("passwords_do_not_match", locale)
                : status === "invalid_otp"
                  ? t("invalid_otp_code", locale)
                  : status === "expired_otp"
                    ? t("expired_otp_code", locale)
                : status === "same_password"
                  ? t("new_password_must_be_different", locale)
                  : t("reset_password_failed", locale)}
          </div>
        ) : null}

        {step === "reset" ? (
          <button
            type="button"
            onClick={() => void handleResendOtp()}
            disabled={loading || !email || retryAfterSeconds > 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            {retryAfterSeconds > 0
              ? t("resend_reset_code_in", locale, {
                  time: formatRetryAfter(retryAfterSeconds),
                })
              : t("resend_reset_code", locale)}
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => void (step === "request" ? handleRequestOtp() : handleResetPassword())}
          disabled={
            loading ||
            !email ||
            (step === "reset" && (!otp || !newPassword || !confirmPassword))
          }
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          {step === "request"
            ? t("send_code", locale)
            : t("reset_password", locale)}
        </button>
      </div>

      <p className="mt-6 text-sm text-[var(--muted)]">
        <Link href="/login" className="font-medium text-slate-900 underline">
          {t("back_to_login", locale)}
        </Link>
      </p>
    </section>
  );
}
