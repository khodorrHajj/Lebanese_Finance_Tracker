"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, LoaderCircle, X } from "lucide-react";

import { fetchTags, updateTransaction } from "@/lib/api";
import { t } from "@/lib/i18n";
import type { Category, Locale, Tag, Transaction } from "@/types";

interface EditTransactionModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  categories: Category[];
  locale: Locale;
  onClose: () => void;
  onUpdated: (transaction: Transaction) => void;
}

export function EditTransactionModal({
  isOpen,
  transaction,
  categories,
  locale,
  onClose,
  onUpdated,
}: EditTransactionModalProps) {
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !transaction) {
      return;
    }

    let isCancelled = false;

    window.queueMicrotask(() => {
      if (isCancelled) {
        return;
      }

      setDescription(transaction.description ?? "");
      setCategoryId(transaction.category?.id ?? null);
      setSelectedTagIds(transaction.tags.map((tag) => tag.id));
      setError(null);
    });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, transaction]);

  useEffect(() => {
    if (!isOpen || categoryId === null) {
      return;
    }

    const activeCategoryId = categoryId;
    let isMounted = true;

    async function loadTags() {
      setIsLoadingTags(true);
      setError(null);

      try {
        const tagRows = await fetchTags(activeCategoryId);

        if (isMounted) {
          setTags(tagRows);
        }
      } catch {
        if (isMounted) {
          setError("load_tags");
        }
      } finally {
        if (isMounted) {
          setIsLoadingTags(false);
        }
      }
    }

    void loadTags();

    return () => {
      isMounted = false;
    };
  }, [categoryId, isOpen]);

  const groupedCategories = useMemo(() => {
    return {
      income: categories.filter((category) => category.type === "income"),
      expense: categories.filter((category) => category.type === "expense"),
    };
  }, [categories]);

  if (!isOpen || !transaction) {
    return null;
  }

  function toggleTag(tagId: number) {
    setSelectedTagIds((currentTagIds) =>
      currentTagIds.includes(tagId)
        ? currentTagIds.filter((id) => id !== tagId)
        : [...currentTagIds, tagId],
    );
  }

  async function handleSubmit() {
    if (!transaction) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updatedTransaction = await updateTransaction(transaction.id, {
        description: description.trim() || null,
        category_id: categoryId ?? transaction.category?.id ?? null,
        tag_ids: selectedTagIds,
      });
      onUpdated(updatedTransaction);
      onClose();
    } catch {
      setError("submit");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {t("edit_transaction_title", locale)}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {t("transaction_details", locale)}
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

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">
              {t("description", locale)}
            </label>
            <input
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">
              {t("category", locale)}
            </label>
            <select
              value={categoryId ?? ""}
              onChange={(event) => {
                setSelectedTagIds([]);
                setCategoryId(event.target.value ? Number(event.target.value) : null);
              }}
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            >
              <option value="">{t("select_category", locale)}</option>
              <optgroup label={t("income", locale)}>
                {groupedCategories.income.map((category) => (
                  <option key={category.id} value={category.id}>
                    {locale === "ar" ? category.name_ar : category.name_en}
                  </option>
                ))}
              </optgroup>
              <optgroup label={t("expense", locale)}>
                {groupedCategories.expense.map((category) => (
                  <option key={category.id} value={category.id}>
                    {locale === "ar" ? category.name_ar : category.name_en}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-800">
              {t("available_tags", locale)}
            </p>
            {categoryId ? (
              tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);

                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${
                          isSelected
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-[var(--border)] bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {isSelected ? <Check className="h-4 w-4" /> : null}
                        {locale === "ar" ? tag.name_ar : tag.name_en}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-[var(--muted)]">
                  {isLoadingTags
                    ? t("loading_dashboard", locale)
                    : t("no_tags_available", locale)}
                </p>
              )
            ) : (
              <p className="text-sm text-[var(--muted)]">
                {t("choose_category_first", locale)}
              </p>
            )}
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error === "load_tags"
                ? t("failed_to_load_claim_data", locale)
                : t("failed_to_update_transaction", locale)}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
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
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? t("saving", locale) : t("save_changes", locale)}
          </button>
        </div>
      </div>
    </div>
  );
}
