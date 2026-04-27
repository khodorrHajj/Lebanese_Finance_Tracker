"use client";

import { useState } from "react";
import axios from "axios";

import { PhoneNumberField } from "@/components/PhoneNumberField";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { updateUserProfile } from "@/lib/api";
import { t } from "@/lib/i18n";
import { guessPhoneCountryAndLocalNumber } from "@/lib/phoneCountries";
import type { Gender, UserResponse } from "@/types";

interface ProfileTabProps {
  profile: UserResponse;
  onProfileUpdated: (profile: UserResponse) => void;
}

export function ProfileTab({ profile, onProfileUpdated }: ProfileTabProps) {
  const { locale } = useLanguage();
  const { setUserProfile } = useAuth();
  const initialPhone = guessPhoneCountryAndLocalNumber(profile.phone_number);
  const [form, setForm] = useState({
    full_name: profile.full_name ?? "",
    phone_country: initialPhone.countryCode,
    phone_number: initialPhone.localNumber,
    gender: profile.gender ?? ("prefer_not_to_say" as Gender),
  });
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<"saved" | "error" | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setStatus(null);
    setFieldError(null);

    try {
      const updatedProfile = await updateUserProfile(form);
      setUserProfile(updatedProfile);
      onProfileUpdated(updatedProfile);
      setStatus("saved");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;

        if (detail === "Phone number already registered") {
          setFieldError(t("phone_already_registered", locale));
        } else if (
          detail === "Enter a valid phone number for the selected country" ||
          detail === "Select a valid phone country"
        ) {
          setFieldError(t("phone_invalid_format", locale));
        }
      }
      setStatus("error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          {t("profile_settings", locale)}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {t("settings_section_profile", locale)}
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">
              {t("account_email", locale)}
            </label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full rounded-xl border border-[var(--border)] bg-slate-50 px-3 py-2.5 text-sm text-slate-600 outline-none"
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
              <option value="prefer_not_to_say">
                {t("prefer_not_to_say", locale)}
              </option>
            </select>
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
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
          </div>

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
            error={fieldError}
          />
        </div>

        {status === "saved" ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {t("profile_updated", locale)}
          </div>
        ) : null}

        {status === "error" ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {t("failed_to_update_profile", locale)}
          </div>
        ) : null}

        <div className="mt-5">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!form.full_name || !form.phone_number || !form.gender || isSaving}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {t("save_changes", locale)}
          </button>
        </div>
      </div>
    </section>
  );
}
