"use client";

import { useMemo } from "react";

import { PHONE_COUNTRIES, findPhoneCountry } from "@/lib/phoneCountries";

interface PhoneNumberFieldProps {
  countryCode: string;
  localNumber: string;
  label: string;
  onCountryCodeChange: (countryCode: string) => void;
  onLocalNumberChange: (localNumber: string) => void;
  error?: string | null;
}

export function PhoneNumberField({
  countryCode,
  localNumber,
  label,
  onCountryCodeChange,
  onLocalNumberChange,
  error,
}: PhoneNumberFieldProps) {
  const selectedCountry = useMemo(
    () => findPhoneCountry(countryCode),
    [countryCode],
  );

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-800">{label}</label>
      <div className="grid gap-3 sm:grid-cols-[170px_minmax(0,1fr)]">
        <select
          value={selectedCountry.code}
          onChange={(event) => onCountryCodeChange(event.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
        >
          {PHONE_COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name} ({country.dialCode})
            </option>
          ))}
        </select>

        <input
          type="tel"
          value={localNumber}
          onChange={(event) => onLocalNumberChange(event.target.value)}
          placeholder={selectedCountry.placeholder}
          autoComplete="tel-national"
          className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
        />
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
