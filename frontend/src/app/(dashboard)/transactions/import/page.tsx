"use client";

import axios from "axios";
import { LoaderCircle, MessageSquare, ScanLine, Upload } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useLanguage } from "@/context/LanguageContext";
import {
  createTransactionFromSms,
  fetchWallets,
  scanReceipt,
} from "@/lib/api";
import { t } from "@/lib/i18n";
import type { Institution, Numeric, OCRScanResult, Transaction } from "@/types";

function toNumber(value: Numeric | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsedValue =
    typeof value === "number" ? value : Number.parseFloat(value);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function formatAmount(value: Numeric | null | undefined, currency: string) {
  const amount = toNumber(value);

  if (amount === null) {
    return "-";
  }

  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  }

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(amount)} LBP`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export default function ImportTransactionsPage() {
  const { locale } = useLanguage();
  const [wallets, setWallets] = useState<Institution[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [receiptResult, setReceiptResult] = useState<OCRScanResult | null>(null);
  const [rawText, setRawText] = useState("");
  const [institutionId, setInstitutionId] = useState<number | undefined>(undefined);
  const [smsResult, setSmsResult] = useState<Transaction | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCreatingSms, setIsCreatingSms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"receipt" | "sms">("receipt");

  useEffect(() => {
    let isMounted = true;

    async function loadWallets() {
      try {
        const walletRows = await fetchWallets();

        if (isMounted) {
          setWallets(walletRows);
        }
      } catch {
        if (isMounted) {
          setError("wallets_failed");
        }
      }
    }

    void loadWallets();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleFileSelect(nextFile: File | null) {
    if (!nextFile) {
      return;
    }

    if (!["image/jpeg", "image/png"].includes(nextFile.type)) {
      setError("invalid_file");
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
    setReceiptResult(null);
    setError(null);
  }

  async function handleScan() {
    if (!file) {
      setError("missing_file");
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      const result = await scanReceipt(file);
      setReceiptResult(result);
    } catch (scanError) {
      if (axios.isAxiosError(scanError) && scanError.response?.status === 413) {
        setError("too_large");
      } else {
        setError("scan_failed");
      }
    } finally {
      setIsScanning(false);
    }
  }

  async function handleCreateSmsDraft() {
    setIsCreatingSms(true);
    setError(null);

    try {
      const transaction = await createTransactionFromSms({
        raw_text: rawText,
        institution_id: institutionId,
      });
      setSmsResult(transaction);
      setRawText("");
      setInstitutionId(undefined);
    } catch {
      setError("sms_failed");
    } finally {
      setIsCreatingSms(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--muted)]">
            {t("transactions", locale)}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">
            {t("import_transactions", locale)}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            {t("import_transactions_description", locale)}
          </p>
        </div>
        <Link
          href="/transactions/review"
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium !text-white transition hover:bg-slate-800"
        >
          {t("open_review_workspace", locale)}
        </Link>
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActivePanel("receipt")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
            activePanel === "receipt"
              ? "bg-slate-900 text-white"
              : "border border-[var(--border)] bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <ScanLine className="h-4 w-4" />
          {t("scan_receipt", locale)}
        </button>
        <button
          type="button"
          onClick={() => setActivePanel("sms")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
            activePanel === "sms"
              ? "bg-slate-900 text-white"
              : "border border-[var(--border)] bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          {t("paste_sms", locale)}
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error === "too_large"
            ? t("receipt_file_too_large", locale)
            : error === "invalid_file"
              ? t("invalid_receipt_file", locale)
              : error === "missing_file"
                ? t("upload_receipt_first", locale)
                : error === "wallets_failed"
                  ? t("failed_to_load_wallets", locale)
                  : error === "sms_failed"
                    ? t("failed_to_create_sms_draft", locale)
                    : t("receipt_scan_failed", locale)}
        </div>
      ) : null}

      {activePanel === "receipt" ? (
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-slate-50/70 px-6 py-10 text-center transition hover:bg-slate-50">
              <input
                type="file"
                accept="image/jpeg,image/png"
                className="sr-only"
                onChange={(event) => {
                  handleFileSelect(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />
              <div className="rounded-full bg-white p-3 text-slate-700 shadow-sm">
                <Upload className="h-6 w-6" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-900">
                {t("upload_receipt", locale)}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {t("drop_receipt_here", locale)}
              </p>
            </label>

            {previewUrl ? (
              <div className="mt-5 rounded-2xl border border-[var(--border)] bg-white p-4">
                <p className="text-sm font-medium text-slate-900">
                  {t("selected_receipt", locale)}
                </p>
                <div className="mt-3 flex justify-center">
                  <Image
                    src={previewUrl}
                    alt={t("selected_receipt", locale)}
                    width={760}
                    height={440}
                    unoptimized
                    className="max-h-[420px] w-auto rounded-xl border border-[var(--border)] object-contain"
                  />
                </div>
              </div>
            ) : null}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => void handleScan()}
                disabled={!file || isScanning}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isScanning ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {isScanning ? t("analyze_receipt", locale) : t("scan", locale)}
              </button>
            </div>
          </div>

          <aside className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">
              {t("receipt_summary", locale)}
            </h3>

            {receiptResult ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                      {t("merchant", locale)}
                    </p>
                    <p className="mt-1 text-sm text-slate-900">
                      {receiptResult.merchant}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                      {t("amount", locale)}
                    </p>
                    <p className="mt-1 text-sm text-slate-900">
                      {formatAmount(receiptResult.amount, receiptResult.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                      {t("date", locale)}
                    </p>
                    <p className="mt-1 text-sm text-slate-900">
                      {formatDate(receiptResult.transaction_date)}
                    </p>
                  </div>
                </div>

                {receiptResult.amount === null ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {t("amount_not_detected", locale)}
                  </div>
                ) : null}

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {t("receipt_saved_for_review", locale)}
                </div>
                <Link
                  href={`/transactions/review?transactionId=${receiptResult.id}`}
                  className="inline-flex w-full justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium !text-white transition hover:bg-slate-800"
                >
                  {t("go_to_review", locale)}
                </Link>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[var(--muted)]">
                {t("upload_receipt", locale)}
              </p>
            )}
          </aside>
        </section>
      ) : null}

      {activePanel === "sms" ? (
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
              {t("sms_draft_hint", locale)}
            </div>

            <div className="mt-5 space-y-2">
              <label className="text-sm font-medium text-slate-800">
                {t("sms_message", locale)}
              </label>
              <textarea
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
                rows={10}
                placeholder={t("sms_message_placeholder", locale)}
                className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </div>

            <div className="mt-5 space-y-2">
              <label className="text-sm font-medium text-slate-800">
                {t("wallets", locale)} ({t("optional", locale)})
              </label>
              <select
                value={institutionId ?? ""}
                onChange={(event) =>
                  setInstitutionId(
                    event.target.value ? Number(event.target.value) : undefined,
                  )
                }
                className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              >
                <option value="">{t("select_wallet", locale)}</option>
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => void handleCreateSmsDraft()}
                disabled={!rawText.trim() || isCreatingSms}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isCreatingSms ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                {isCreatingSms
                  ? t("creating_sms_draft", locale)
                  : t("create_sms_draft", locale)}
              </button>
            </div>
          </div>

          <aside className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">
              {t("review_queue", locale)}
            </h3>
            {smsResult ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {t("sms_saved_for_review", locale)}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                    {t("amount", locale)}
                  </p>
                  <p className="mt-1 text-sm text-slate-900">
                    {formatAmount(smsResult.amount, smsResult.currency)}
                  </p>
                </div>
                <Link
                  href={`/transactions/review?transactionId=${smsResult.id}`}
                  className="inline-flex w-full justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium !text-white transition hover:bg-slate-800"
                >
                  {t("go_to_review", locale)}
                </Link>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[var(--muted)]">
                {t("paste_sms_description", locale)}
              </p>
            )}
          </aside>
        </section>
      ) : null}
    </div>
  );
}
