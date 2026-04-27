"use client";

import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PhoneNumberField } from "@/components/PhoneNumberField";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { getGoogleAuthURL, resendEmailVerificationForEmail, verifyEmail } from "@/lib/api";
import { t } from "@/lib/i18n";
import type { Gender } from "@/types";

export default function RegisterPage() {
  const router = useRouter();
  const { locale } = useLanguage();
  const { user, loading, register, completeSession } = useAuth();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone_country: "LB",
    phone_number: "",
    gender: "prefer_not_to_say" as Gender,
    password: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof form | "otp", string>>>({});
  const [step, setStep] = useState<"register" | "verify">("register");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationOtp, setVerificationOtp] = useState("");
  const [verificationRetryAfterSeconds, setVerificationRetryAfterSeconds] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);

  function mapRegisterFieldError(
    fieldName: keyof typeof form | "otp",
    message: string,
  ) {
    if (fieldName === "email") {
      return t("email_invalid_format", locale);
    }

    if (fieldName === "phone_number") {
      if (message.includes("digits only")) {
        return t("phone_digits_only", locale);
      }
      return t("phone_invalid_format", locale);
    }

    if (fieldName === "full_name") {
      return t("full_name_too_short", locale);
    }

    if (fieldName === "password") {
      return t("password_too_short", locale);
    }

    return message;
  }

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

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

  async function handleSubmit() {
    setError(null);
    setErrorDetail(null);
    setFieldErrors({});

    if (form.password.length < 8) {
      setFieldErrors((current) => ({
        ...current,
        password: t("password_too_short", locale),
      }));
      return;
    }

    if (form.password !== form.confirmPassword) {
      setFieldErrors((current) => ({
        ...current,
        confirmPassword: t("passwords_do_not_match", locale),
      }));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await register({
        full_name: form.full_name,
        email: form.email,
        phone_number: form.phone_number,
        phone_country: form.phone_country,
        gender: form.gender,
        password: form.password,
      });

      setVerificationEmail(response.email);
      setVerificationOtp("");
      setVerificationStatus("otp_sent");
      setVerificationRetryAfterSeconds(0);
      setStep("verify");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;

        if (error.response?.status === 409 && detail === "Email already registered") {
          setFieldErrors({ email: t("email_already_registered", locale) });
          return;
        }

        if (error.response?.status === 429 && typeof detail === "object" && detail) {
          const retryAfterSeconds = Number(detail.retry_after_seconds ?? 0);
          if (retryAfterSeconds > 0) {
            setVerificationRetryAfterSeconds(retryAfterSeconds);
            setVerificationEmail(form.email);
            setVerificationStatus("cooldown");
            setStep("verify");
            return;
          }
        }

        if (error.response?.status === 409 && detail === "Phone number already registered") {
          setFieldErrors({ phone_number: t("phone_already_registered", locale) });
          return;
        }

        if (error.response?.status === 422 && typeof detail === "string") {
          if (
            detail === "Enter a valid phone number for the selected country" ||
            detail === "Select a valid phone country"
          ) {
            setFieldErrors({
              phone_number: t("phone_invalid_format", locale),
            });
            return;
          }
        }

        if (error.response?.status === 422 && Array.isArray(detail)) {
          const nextErrors: Partial<Record<keyof typeof form | "otp", string>> = {};

          for (const issue of detail) {
            const fieldName = issue?.loc?.[issue.loc.length - 1];
            if (fieldName && typeof fieldName === "string") {
              nextErrors[fieldName as keyof typeof nextErrors] = mapRegisterFieldError(
                fieldName as keyof typeof form | "otp",
                String(issue.msg ?? ""),
              );
            }
          }

          if (Object.keys(nextErrors).length > 0) {
            setFieldErrors(nextErrors);
            return;
          }
        }

        if (error.response?.status === 502 || error.response?.status === 503) {
          setError("delivery_failed");
          return;
        }
      }

      setError("register_failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyEmail() {
    setIsSubmitting(true);
    setVerificationStatus(null);
    setFieldErrors({});

    try {
      const tokens = await verifyEmail({
        email: verificationEmail,
        otp: verificationOtp,
      });
      await completeSession(tokens);
      router.replace("/dashboard");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;
        if (detail === "Invalid OTP") {
          setFieldErrors({ otp: t("invalid_otp_code", locale) });
          return;
        }
        if (detail === "OTP expired") {
          setFieldErrors({ otp: t("expired_otp_code", locale) });
          return;
        }
      }

      setVerificationStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendCode() {
    setVerificationStatus(null);
    setIsSubmitting(true);

    try {
      const response = await resendEmailVerificationForEmail(verificationEmail);
      setVerificationRetryAfterSeconds(response.retry_after_seconds ?? 0);
      setVerificationStatus("otp_resent");
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
          setVerificationStatus("cooldown");
        } else {
          setVerificationStatus("error");
        }
      } else {
        setVerificationStatus("error");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignup() {
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
      setError("register_failed");
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
    <section className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-white p-8 shadow-sm">
      <p className="text-sm font-medium text-[var(--muted)]">
        {t("create_account", locale)}
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-900">
        {step === "register" ? t("register", locale) : t("verify_your_email", locale)}
      </h1>
      <p className="mt-3 text-sm text-[var(--muted)]">
        {step === "register"
          ? t("create_your_account", locale)
          : t("complete_signup_with_verification", locale)}
      </p>

      {error ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error === "password_mismatch"
            ? t("passwords_do_not_match", locale)
            : error === "short_password"
              ? t("password_too_short", locale)
              : error === "delivery_failed"
                ? t("verification_delivery_failed", locale)
                : errorDetail ?? t("failed_to_register", locale)}
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        {step === "verify" ? (
          <>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {t("verification_code_sent_to_email", locale, { email: verificationEmail })}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">
                {t("otp_code", locale)}
              </label>
              <input
                type="text"
                value={verificationOtp}
                onChange={(event) =>
                  setVerificationOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                autoComplete="one-time-code"
                className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
              {fieldErrors.otp ? (
                <p className="text-sm text-rose-700">{fieldErrors.otp}</p>
              ) : null}
            </div>

            {verificationStatus ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {verificationStatus === "otp_sent" || verificationStatus === "otp_resent"
                  ? verificationStatus === "otp_sent"
                    ? t("verification_code_sent_to_email", locale, {
                        email: verificationEmail,
                      })
                    : t("verification_code_resent", locale)
                  : verificationStatus === "cooldown"
                    ? t("verification_code_resend_wait", locale, {
                        time: formatRetryAfter(verificationRetryAfterSeconds),
                      })
                    : t("verification_failed", locale)}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void handleVerifyEmail()}
              disabled={isSubmitting || verificationOtp.length !== 6}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {t("verify_email", locale)}
            </button>

            <button
              type="button"
              onClick={() => void handleResendCode()}
              disabled={isSubmitting || verificationRetryAfterSeconds > 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              {verificationRetryAfterSeconds > 0
                ? t("resend_verification_code_in", locale, {
                    time: formatRetryAfter(verificationRetryAfterSeconds),
                  })
                : t("resend_code", locale)}
            </button>
          </>
        ) : (
          <>
        <button
          type="button"
          onClick={() => void handleGoogleSignup()}
          disabled={isGoogleLoading || isSubmitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          {isGoogleLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          {t("sign_up_with_google", locale)}
        </button>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border)]" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              or
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800">
            {t("full_name", locale)}
          </label>
          <input
            type="text"
            value={form.full_name}
            onChange={(event) =>
              setForm((current) => ({ ...current, full_name: event.target.value }))
            }
            autoComplete="name"
            className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          />
          {fieldErrors.full_name ? (
            <p className="text-sm text-rose-700">{fieldErrors.full_name}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800">
            {t("email", locale)}
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({ ...current, email: event.target.value }))
            }
            autoComplete="email"
            className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          />
          {fieldErrors.email ? (
            <p className="text-sm text-rose-700">{fieldErrors.email}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <PhoneNumberField
            label={t("phone_number", locale)}
            countryCode={form.phone_country}
            localNumber={form.phone_number}
            onCountryCodeChange={(countryCode) =>
              setForm((current) => ({ ...current, phone_country: countryCode }))
            }
            onLocalNumberChange={(localNumber) =>
              setForm((current) => ({ ...current, phone_number: localNumber }))
            }
            error={fieldErrors.phone_number}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800">
            {t("gender", locale)}
          </label>
          <select
            value={form.gender}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                gender: event.target.value as Gender,
              }))
            }
            className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          >
            <option value="male">{t("male", locale)}</option>
            <option value="female">{t("female", locale)}</option>
            <option value="prefer_not_to_say">{t("prefer_not_to_say", locale)}</option>
          </select>
          {fieldErrors.gender ? (
            <p className="text-sm text-rose-700">{fieldErrors.gender}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800">
            {t("password", locale)}
          </label>
          <input
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm((current) => ({ ...current, password: event.target.value }))
            }
            autoComplete="new-password"
            className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          />
          {fieldErrors.password ? (
            <p className="text-sm text-rose-700">{fieldErrors.password}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800">
            {t("confirm_password", locale)}
          </label>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                confirmPassword: event.target.value,
              }))
            }
            autoComplete="new-password"
            className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          />
          {fieldErrors.confirmPassword ? (
            <p className="text-sm text-rose-700">{fieldErrors.confirmPassword}</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={
            isGoogleLoading ||
            !form.full_name ||
            !form.email ||
            !form.phone_number ||
            !form.password ||
            !form.confirmPassword ||
            isSubmitting
          }
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          {isSubmitting ? t("creating_account", locale) : t("register", locale)}
        </button>
          </>
        )}
      </div>

      <p className="mt-6 text-sm text-[var(--muted)]">
        {t("already_have_account", locale)}{" "}
        <Link href="/login" className="font-medium text-slate-900 underline">
          {t("login", locale)}
        </Link>
      </p>
    </section>
  );
}
