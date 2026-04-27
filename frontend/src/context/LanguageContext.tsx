"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Locale } from "@/types";

type Direction = "ltr" | "rtl";

interface LanguageContextValue {
  locale: Locale;
  direction: Direction;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const STORAGE_KEY = "liratrack.locale";

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const direction: Direction = locale === "ar" ? "rtl" : "ltr";
    const root = window.document.documentElement;

    root.lang = locale;
    root.dir = direction;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const value = useMemo<LanguageContextValue>(() => {
    return {
      locale,
      direction: locale === "ar" ? "rtl" : "ltr",
      setLocale: setLocaleState,
      toggleLocale: () =>
        setLocaleState((currentLocale) =>
          currentLocale === "en" ? "ar" : "en",
        ),
    };
  }, [locale]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return context;
}
