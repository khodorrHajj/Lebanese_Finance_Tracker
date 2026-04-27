"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, X } from "lucide-react";

import { createWallet } from "@/lib/api";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/context/LanguageContext";
import type { Institution, InstitutionCreate, Numeric } from "@/types";

interface AddWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (wallet: Institution) => void;
}

type WalletFormState = Omit<InstitutionCreate, "current_balance"> & {
  current_balance: Numeric | "";
  lbp_balance: Numeric | "";
};

function getInitialWalletForm(): WalletFormState {
  return {
    name: "",
    card_type: "Cash_USD",
    last_four_digits: "",
    current_balance: "",
    lbp_balance: "",
  };
}

type WalletMode = "cash" | "card";
type CashWalletChoice = "Cash_USD" | "Cash_LBP" | "both";
type CardWalletType = "Visa" | "Mastercard" | "Meza";

const cardTypeOptions: CardWalletType[] = [
  "Visa",
  "Mastercard",
  "Meza",
];

export function AddWalletModal({
  isOpen,
  onClose,
  onCreated,
}: AddWalletModalProps) {
  const { locale } = useLanguage();
  const [form, setForm] = useState<WalletFormState>(() => getInitialWalletForm());
  const [walletMode, setWalletMode] = useState<WalletMode>("cash");
  const [cashWalletChoice, setCashWalletChoice] =
    useState<CashWalletChoice>("Cash_USD");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const isCashWallet = walletMode === "cash";
  const shouldCreateBothCashWallets =
    walletMode === "cash" && cashWalletChoice === "both";

  function handleClose() {
    setForm(getInitialWalletForm());
    setWalletMode("cash");
    setCashWalletChoice("Cash_USD");
    setError(null);
    setIsSubmitting(false);
    onClose();
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    try {
      const trimmedName = form.name.trim();

      if (walletMode === "cash") {
        if (shouldCreateBothCashWallets) {
          const [usdWallet, lbpWallet] = await Promise.all([
            createWallet({
              name: `${trimmedName} USD`,
              card_type: "Cash_USD",
              current_balance: form.current_balance === "" ? 0 : form.current_balance,
            }),
            createWallet({
              name: `${trimmedName} LBP`,
              card_type: "Cash_LBP",
              current_balance: form.lbp_balance === "" ? 0 : form.lbp_balance,
            }),
          ]);

          onCreated(usdWallet);
          onCreated(lbpWallet);
        } else {
          const cardType =
            cashWalletChoice === "Cash_LBP" ? "Cash_LBP" : "Cash_USD";
          const wallet = await createWallet({
            name: trimmedName,
            card_type: cardType,
            current_balance: form.current_balance === "" ? 0 : form.current_balance,
          });

          onCreated(wallet);
        }
      } else {
        const wallet = await createWallet({
          name: trimmedName,
          card_type: form.card_type,
          last_four_digits: form.last_four_digits
            ? form.last_four_digits.trim()
            : undefined,
          current_balance: form.current_balance === "" ? 0 : form.current_balance,
        });

        onCreated(wallet);
      }
      handleClose();
    } catch {
      setError("create_failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {t("add_wallet", locale)}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {t("add_wallet_description", locale)}
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
              {t("wallet_name", locale)}
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder={t("wallet_name_placeholder", locale)}
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">
              {t("wallet_type", locale)}
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["cash", "card"] as WalletMode[]).map((mode) => {
                const isSelected = walletMode === mode;

                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setWalletMode(mode);
                      setForm((current) => ({
                        ...current,
                        card_type: mode === "cash" ? "Cash_USD" : "Visa",
                        last_four_digits: "",
                      }));
                    }}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-[var(--border)] bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {mode === "cash" ? t("cash_wallet", locale) : t("card_wallet", locale)}
                  </button>
                );
              })}
            </div>
          </div>

          {walletMode === "cash" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">
                {t("cash_wallet_currency", locale)}
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { value: "Cash_USD", label: t("usd_wallet", locale) },
                  { value: "Cash_LBP", label: t("lbp_wallet", locale) },
                  { value: "both", label: t("usd_and_lbp_wallets", locale) },
                ].map((option) => {
                  const isSelected = cashWalletChoice === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setCashWalletChoice(option.value as CashWalletChoice);
                        setForm((current) => ({
                          ...current,
                          card_type:
                            option.value === "Cash_LBP" ? "Cash_LBP" : "Cash_USD",
                          last_four_digits: "",
                        }));
                      }}
                      className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                        isSelected
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-[var(--border)] bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {walletMode === "card" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800">
                  {t("wallet_card_type", locale)}
                </label>
                <select
                  value={form.card_type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      card_type: event.target.value as InstitutionCreate["card_type"],
                    }))
                  }
                  className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                >
                  {cardTypeOptions.map((cardType) => (
                    <option key={cardType} value={cardType}>
                      {cardType}
                    </option>
                  ))}
                </select>
              </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">
                {t("last_four_digits", locale)}
              </label>
              <input
                type="text"
                value={form.last_four_digits ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    last_four_digits: event.target.value.slice(0, 4),
                  }))
                }
                maxLength={4}
                disabled={isCashWallet}
                placeholder={t("optional", locale)}
                className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 disabled:bg-slate-100"
              />
            </div>
            </div>
          ) : null}

          <div className={`grid gap-4 ${shouldCreateBothCashWallets ? "sm:grid-cols-2" : ""}`}>
            <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">
              {shouldCreateBothCashWallets
                ? t("usd_starting_balance", locale)
                : t("current_balance", locale)}
            </label>
            <input
              type="number"
              value={form.current_balance}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  current_balance: event.target.value,
                }))
              }
              min="0"
              step="0.01"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
            </div>
            {shouldCreateBothCashWallets ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800">
                  {t("lbp_starting_balance", locale)}
                </label>
                <input
                  type="number"
                  value={form.lbp_balance}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      lbp_balance: event.target.value,
                    }))
                  }
                  min="0"
                  step="1"
                  className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {t("wallet_created_failed", locale)}
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
            disabled={!form.name.trim() || isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? t("creating_wallet", locale) : t("create_wallet", locale)}
          </button>
        </div>
      </div>
    </div>
  );
}
