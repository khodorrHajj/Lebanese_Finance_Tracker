"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AddWalletModal } from "@/components/AddWalletModal";
import { useLanguage } from "@/context/LanguageContext";
import { fetchWallets } from "@/lib/api";
import { t } from "@/lib/i18n";
import { getWalletTypeLabel } from "@/lib/walletLabels";
import type { Institution, Numeric } from "@/types";

function toNumber(value: Numeric | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsedValue =
    typeof value === "number" ? value : Number.parseFloat(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatWalletBalance(wallet: Institution, locale: "en" | "ar") {
  const amount = toNumber(wallet.current_balance);

  if (wallet.card_type === "Cash_LBP") {
    const formatted = new Intl.NumberFormat(
      locale === "ar" ? "ar-LB" : "en-US",
      { maximumFractionDigits: 0 },
    ).format(amount);
    return locale === "ar" ? `${formatted} ل.ل` : `${formatted} LBP`;
  }

  return new Intl.NumberFormat(locale === "ar" ? "ar-LB" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function WalletsPage() {
  const { locale } = useLanguage();
  const [wallets, setWallets] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddWalletOpen, setIsAddWalletOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadWallets() {
      setLoading(true);
      setError(null);

      try {
        const walletRows = await fetchWallets();

        if (!isMounted) {
          return;
        }

        setWallets(walletRows);
      } catch {
        if (isMounted) {
          setError("load_failed");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadWallets();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleWalletCreated(wallet: Institution) {
    setWallets((currentWallets) => [wallet, ...currentWallets]);
  }

  return (
    <>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {t("wallets", locale)}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {t("add_first_wallet", locale)}
            </p>
          </div>

          <button
            type="button"
            data-tour="add-wallet"
            onClick={() => setIsAddWalletOpen(true)}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            {t("add_wallet", locale)}
          </button>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {t("failed_to_load_wallets", locale)}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-slate-50 px-4 py-10 text-center text-sm text-[var(--muted)]">
            {t("loading_dashboard", locale)}
          </div>
        ) : null}

        {!loading && wallets.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {wallets.map((wallet) => (
              <Link
                key={wallet.id}
                href={`/wallets/${wallet.id}`}
                className="rounded-2xl border border-[var(--border)] bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {wallet.name}
                    </h3>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {formatWalletBalance(wallet, locale)}
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {getWalletTypeLabel(wallet.card_type, locale)}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                      {t("wallet_card_type", locale)}
                    </p>
                    <p className="mt-1 text-sm text-slate-800">
                      {getWalletTypeLabel(wallet.card_type, locale)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                      {t("last_four_digits", locale)}
                    </p>
                    <p className="mt-1 text-sm text-slate-800">
                      {wallet.last_four_digits || "-"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : null}

        {!loading && wallets.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-slate-50 px-4 py-10 text-center text-sm text-[var(--muted)]">
            {t("no_wallets_found", locale)}
          </div>
        ) : null}
      </section>

      <AddWalletModal
        isOpen={isAddWalletOpen}
        onClose={() => setIsAddWalletOpen(false)}
        onCreated={handleWalletCreated}
      />
    </>
  );
}
