"use client";

import { useState } from "react";
import axios from "axios";
import { LoaderCircle } from "lucide-react";

import { PhoneNumberField } from "@/components/PhoneNumberField";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { updateUserProfile } from "@/lib/api";
import { t } from "@/lib/i18n";
import { guessPhoneCountryAndLocalNumber } from "@/lib/phoneCountries";
import type { Gender, UserResponse } from "@/types";

interface CompleteProfileModalProps {
  user: UserResponse;
}

export function CompleteProfileModal({ user }: CompleteProfileModalProps) {
  const { locale } = useLanguage();
  const { setUserProfile } = useAuth();
  const initialPhone = guessPhoneCountryAndLocalNumber(user.phone_number);
  const [form, setForm] = useState({
    full_name: user.full_name ?? "",
    phone_country: initialPhone.countryCode,
    phone_number: initialPhone.localNumber,
    gender: user.gender ?? ("prefer_not_to_say" as Gender),
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setError(null);

    try {
      const updatedProfile = await updateUserProfile(form);
      setUserProfile(updatedProfile);
    } catch (caughtError) {
      if (axios.isAxiosError(caughtError)) {
        const detail = caughtError.response?.data?.detail;

        if (detail === "Phone number already registered") {
          setError(t("phone_already_registered", locale));
        } else if (
          detail === "Enter a valid phone number for the selected country" ||
          detail === "Select a valid phone country"
        ) {
          setError(t("phone_invalid_format", locale));
        } else {
          setError(t("failed_to_update_profile", locale));
        }
      } else {
        setError(t("failed_to_update_profile", locale));
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-slate-950/55 px-3 pb-3 pt-8 sm:items-center sm:justify-center sm:p-6">
      <section className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-white p-5 shadow-2xl">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">
            Complete your profile
          </h2>
          <p className="text-sm text-[var(--muted)]">
            Add the missing details from Google sign-in before using your wallet.
          </p>
        </div>

        <div className="mt-5 grid gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">
              {t("full_name", locale)}
            </label>
            <input
              type="text"
              value={form.full_name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  full_name: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
          </div>

          <PhoneNumberField
            label={t("phone_number", locale)}
            countryCode={form.phone_country}
            localNumber={form.phone_number}
            onCountryCodeChange={(phoneCountry) =>
              setForm((current) => ({ ...current, phone_country: phoneCountry }))
            }
            onLocalNumberChange={(phoneNumber) =>
              setForm((current) => ({ ...current, phone_number: phoneNumber }))
            }
            error={error}
          />

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
              <option value="prefer_not_to_say">
                {t("prefer_not_to_say", locale)}
              </option>
            </select>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!form.full_name || !form.phone_number || isSaving}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          {t("save_changes", locale)}
        </button>
      </section>
    </div>
  );
}
