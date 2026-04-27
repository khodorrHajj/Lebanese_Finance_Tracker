export interface PhoneCountryOption {
  code: string;
  name: string;
  dialCode: string;
  placeholder: string;
}

export const PHONE_COUNTRIES: PhoneCountryOption[] = [
  { code: "LB", name: "Lebanon", dialCode: "+961", placeholder: "3 123 456" },
  { code: "US", name: "United States", dialCode: "+1", placeholder: "201 555 0123" },
  { code: "CA", name: "Canada", dialCode: "+1", placeholder: "416 555 0123" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", placeholder: "7400 123456" },
  { code: "FR", name: "France", dialCode: "+33", placeholder: "6 12 34 56 78" },
  { code: "DE", name: "Germany", dialCode: "+49", placeholder: "1512 3456789" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", placeholder: "50 123 4567" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", placeholder: "50 123 4567" },
  { code: "QA", name: "Qatar", dialCode: "+974", placeholder: "3312 3456" },
  { code: "KW", name: "Kuwait", dialCode: "+965", placeholder: "5000 1234" },
  { code: "EG", name: "Egypt", dialCode: "+20", placeholder: "10 1234 5678" },
  { code: "TR", name: "Turkey", dialCode: "+90", placeholder: "532 123 4567" },
  { code: "AU", name: "Australia", dialCode: "+61", placeholder: "412 345 678" },
];

export function findPhoneCountry(code: string) {
  return PHONE_COUNTRIES.find((country) => country.code === code) ?? PHONE_COUNTRIES[0];
}

export function guessPhoneCountryAndLocalNumber(rawPhoneNumber: string | null | undefined) {
  const value = (rawPhoneNumber ?? "").trim();

  if (!value.startsWith("+")) {
    return {
      countryCode: "LB",
      localNumber: value,
    };
  }

  const match = [...PHONE_COUNTRIES]
    .sort((left, right) => right.dialCode.length - left.dialCode.length)
    .find((country) => value.startsWith(country.dialCode));

  if (!match) {
    return {
      countryCode: "LB",
      localNumber: value.replace(/^\+/, ""),
    };
  }

  return {
    countryCode: match.code,
    localNumber: value.slice(match.dialCode.length),
  };
}
