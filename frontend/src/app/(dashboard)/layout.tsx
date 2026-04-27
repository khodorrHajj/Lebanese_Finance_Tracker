"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  ChevronDown,
  ClipboardCheck,
  Languages,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Settings,
  UserCircle,
  Wallet,
} from "lucide-react";

import { AppTour } from "@/components/AppTour";
import { CompleteProfileModal } from "@/components/CompleteProfileModal";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";

const primaryNavItems = [
  {
    href: "/dashboard",
    labelKey: "dashboard" as const,
    icon: LayoutDashboard,
  },
  {
    href: "/transactions",
    labelKey: "transactions" as const,
    icon: ArrowLeftRight,
  },
  {
    href: "/transactions/review",
    labelKey: "review_queue" as const,
    icon: ClipboardCheck,
  },
  {
    href: "/wallets",
    labelKey: "wallets" as const,
    icon: Wallet,
  },
];

const settingsNavItem = {
  href: "/settings",
  labelKey: "settings" as const,
  icon: Settings,
};

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const { locale, direction, setLocale, toggleLocale } = useLanguage();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (user?.preferred_language === "en" || user?.preferred_language === "ar") {
      setLocale(user.preferred_language);
    }
  }, [setLocale, user?.preferred_language]);

  const sidebarSideClass = direction === "rtl" ? "right-0" : "left-0";
  const desktopOffsetClass = direction === "rtl" ? "lg:mr-72" : "lg:ml-72";
  const needsProfileCompletion = Boolean(
    user && (!user.phone_number || !user.gender),
  );

  const pageTitle = useMemo(() => {
    const allNavItems = [...primaryNavItems, settingsNavItem];
    const activeItem = [...allNavItems]
      .sort((firstItem, secondItem) => secondItem.href.length - firstItem.href.length)
      .find(
        (item) => item.href === pathname || pathname.startsWith(`${item.href}/`),
      );
    return activeItem ? t(activeItem.labelKey, locale) : t("dashboard", locale);
  }, [locale, pathname]);

  function isNavItemActive(href: string) {
    if (href === "/transactions") {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <LoaderCircle className="h-8 w-8 animate-spin text-slate-700" />
          <p className="text-sm text-[var(--muted)]">
            {t("checking_session", locale)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div
        className={`fixed inset-y-0 z-40 hidden w-72 flex-col ${sidebarSideClass} border-[var(--border)] bg-[var(--sidebar)] text-[var(--sidebar-foreground)] shadow-xl transition-transform duration-200 lg:flex lg:translate-x-0 lg:border lg:shadow-none`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-6">
          <p className="text-lg font-semibold">{t("app_name", locale)}</p>
        </div>

        <nav className="space-y-2 px-4 py-6">
          {primaryNavItems.map(({ href, labelKey, icon: Icon }) => {
            const isActive = isNavItemActive(href);

            return (
              <Link
                key={href}
                href={href}
                data-tour={
                  href === "/wallets"
                    ? "nav-wallets"
                    : href === "/transactions"
                      ? "nav-transactions"
                      : undefined
                }
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-200 hover:bg-white/10"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{t(labelKey, locale)}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={desktopOffsetClass}>
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div>
              <p className="text-sm text-[var(--muted)]">{t("app_name", locale)}</p>
              <h1 className="text-lg font-semibold text-slate-900">{pageTitle}</h1>
            </div>

            <div className="relative flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((current) => !current)}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                aria-label={t("profile", locale)}
                aria-expanded={isProfileMenuOpen}
              >
                <UserCircle className="h-5 w-5" />
                <ChevronDown className="h-4 w-4" />
              </button>

              {isProfileMenuOpen ? (
                <div className="absolute end-0 top-12 z-30 w-56 overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-xl">
                  <Link
                    href="/settings"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-start text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <Settings className="h-4 w-4" />
                    {t("settings", locale)}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      toggleLocale();
                      setIsProfileMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-start text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <Languages className="h-4 w-4" />
                    EN | AR
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      void logout();
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-start text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <LogOut className="h-4 w-4" />
                    {t("logout", locale)}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="px-4 py-6 pb-24 sm:px-6 lg:pb-6">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-[var(--border)] bg-white px-2 py-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] lg:hidden">
        {primaryNavItems.map(({ href, labelKey, icon: Icon }) => {
          const isActive = isNavItemActive(href);

          return (
            <Link
              key={href}
              href={href}
              data-tour={
                href === "/wallets"
                  ? "nav-wallets"
                  : href === "/transactions"
                    ? "nav-transactions"
                    : undefined
              }
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-medium transition ${
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="line-clamp-1">{t(labelKey, locale)}</span>
            </Link>
          );
        })}
      </nav>

      <AppTour locale={locale} />
      {needsProfileCompletion ? <CompleteProfileModal user={user} /> : null}
    </div>
  );
}
