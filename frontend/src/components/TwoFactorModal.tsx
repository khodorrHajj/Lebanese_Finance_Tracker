"use client";

import { LoaderCircle, X } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { verify2FA } from "@/lib/api";
import { t } from "@/lib/i18n";

interface TwoFactorModalProps {
  isOpen: boolean;
  tempToken: string | null;
  onClose: () => void;
  onVerified?: () => void;
}

export function TwoFactorModal({
  isOpen,
  tempToken,
  onClose,
  onVerified,
}: TwoFactorModalProps) {
  const router = useRouter();
  const { completeSession } = useAuth();
  const { locale } = useLanguage();
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !tempToken) {
    return null;
  }

  async function handleSubmit() {
    if (!tempToken) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const tokens = await verify2FA(tempToken, code);
      await completeSession(tokens);
      setCode("");
      if (onVerified) {
        onVerified();
      } else {
        onClose();
        router.replace("/dashboard");
      }
    } catch {
      setError("verify_failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    setCode("");
    setError(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {t("two_factor_title", locale)}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {t("two_factor_description", locale)}
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

        <div className="space-y-4 px-6 py-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">
              {t("verification_code", locale)}
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-center text-lg tracking-[0.3em] text-slate-900 outline-none transition focus:border-slate-400"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {t("failed_to_verify_2fa", locale)}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
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
            disabled={code.length !== 6 || isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? t("verifying", locale) : t("verify_code", locale)}
          </button>
        </div>
      </div>
    </div>
  );
}
