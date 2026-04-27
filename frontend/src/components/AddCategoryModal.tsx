"use client";

import { useState } from "react";
import { LoaderCircle, X } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import { createCategory } from "@/lib/api";
import { t } from "@/lib/i18n";
import type { Category, CategoryType } from "@/types";

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (category: Category) => void;
}

export function AddCategoryModal({
  isOpen,
  onClose,
  onCreated,
}: AddCategoryModalProps) {
  const { locale } = useLanguage();
  const [form, setForm] = useState({
    name: "",
    type: "expense" as CategoryType,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    try {
      const normalizedName = form.name.trim();
      const category = await createCategory({
        name_en: normalizedName,
        name_ar: normalizedName,
        type: form.type,
        lifecycle_type: "standard",
      });
      onCreated(category);
      setForm({ name: "", type: "expense" });
      onClose();
    } catch {
      setError("create_failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {t("add_category", locale)}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {t("add_category_description", locale)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
            aria-label={t("cancel", locale)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">
              {t("category_name", locale)}
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder={t("category_name_placeholder", locale)}
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">
              {t("type", locale)}
            </label>
            <select
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  type: event.target.value as CategoryType,
                }))
              }
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            >
              <option value="expense">{t("expense", locale)}</option>
              <option value="income">{t("income", locale)}</option>
            </select>
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {t("failed_to_create_category", locale)}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
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
            {t("add_category", locale)}
          </button>
        </div>
      </div>
    </div>
  );
}
