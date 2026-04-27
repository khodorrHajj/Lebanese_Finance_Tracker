"use client";

import axios from "axios";
import { useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  changePassword,
  deleteCurrentUser,
  enable2FA,
  setPassword,
  setup2FA,
} from "@/lib/api";
import { t } from "@/lib/i18n";
import type { TwoFASetupResponse, UserResponse } from "@/types";

interface SecurityTabProps {
  profile: UserResponse;
  onProfileUpdated: (profile: UserResponse) => void;
}

export function SecurityTab({ profile, onProfileUpdated }: SecurityTabProps) {
  const { locale } = useLanguage();
  const { logout, refreshUser, setUserProfile } = useAuth();
  const [setupData, setSetupData] = useState<TwoFASetupResponse | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [setupState, setSetupState] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_new_password: "",
  });
  const [passwordState, setPasswordState] = useState<
    | "idle"
    | "saving"
    | "success"
    | "error"
    | "mismatch"
    | "short"
    | "same_password"
    | "current_password_incorrect"
  >("idle");
  const [deleteState, setDeleteState] = useState<"idle" | "deleting" | "error">("idle");
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSetup2FA() {
    setSetupState("loading");

    try {
      const response = await setup2FA();
      setSetupData(response);
      setSetupState("idle");
    } catch {
      setSetupState("error");
    }
  }

  async function handleEnable2FA() {
    setSetupState("loading");

    try {
      await enable2FA({ totp_code: totpCode });
      const refreshedProfile = await refreshUser();
      setUserProfile(refreshedProfile);
      onProfileUpdated(refreshedProfile);
      setSetupData(null);
      setTotpCode("");
      setSetupState("success");
    } catch {
      setSetupState("error");
    }
  }

  async function handlePasswordSave() {
    if (passwordForm.new_password.length < 8) {
      setPasswordState("short");
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_new_password) {
      setPasswordState("mismatch");
      return;
    }

    setPasswordState("saving");

    try {
      if (profile.has_password) {
        await changePassword({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        });
      } else {
        await setPassword({
          new_password: passwordForm.new_password,
        });
        const refreshedProfile = await refreshUser();
        setUserProfile(refreshedProfile);
        onProfileUpdated(refreshedProfile);
      }

      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_new_password: "",
      });
      setPasswordState("success");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (
          error.response?.status === 400 &&
          error.response?.data?.detail === "New password must be different from the current password"
        ) {
          setPasswordState("same_password");
        } else if (
          error.response?.status === 401 &&
          error.response?.data?.detail === "Current password is incorrect"
        ) {
          setPasswordState("current_password_incorrect");
        } else {
          setPasswordState("error");
        }
      } else {
        setPasswordState("error");
      }
    }
  }

  async function handleDeleteAccount() {
    setDeleteState("deleting");

    try {
      await deleteCurrentUser();
      logout();
    } catch {
      setDeleteState("error");
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          {t("security_settings", locale)}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {t("settings_section_security", locale)}
        </p>

        <div className="mt-6 space-y-4">
          {profile.two_factor_enabled ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <p className="text-sm font-medium text-emerald-800">
                {t("two_factor_active", locale)}
              </p>
              <button
                type="button"
                onClick={() => setNotice(t("contact_support_disable_2fa", locale))}
                className="mt-3 rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100"
              >
                {t("disable_two_factor", locale)}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
              <p className="text-sm font-medium text-amber-900">
                {t("two_factor_disabled", locale)}
              </p>
              <button
                type="button"
                onClick={() => void handleSetup2FA()}
                disabled={setupState === "loading"}
                className="mt-3 rounded-xl bg-amber-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-amber-400"
              >
                {t("enable_two_factor", locale)}
              </button>
            </div>
          )}

          {setupData ? (
            <div className="rounded-2xl border border-[var(--border)] bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-900">
                {t("scan_qr_code", locale)}
              </p>
              <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-start">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${setupData.qr_code_base64}`}
                  alt="2FA QR code"
                  className="h-48 w-48 rounded-xl border border-[var(--border)] bg-white p-3"
                />
                <div className="flex-1 space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                      {t("manual_secret", locale)}
                    </p>
                    <p className="mt-1 rounded-xl border border-[var(--border)] bg-white px-3 py-2 font-mono text-sm text-slate-800">
                      {setupData.secret}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-800">
                      {t("enter_six_digit_code", locale)}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={totpCode}
                      onChange={(event) =>
                        setTotpCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleEnable2FA()}
                    disabled={totpCode.length !== 6 || setupState === "loading"}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {t("verify_enable", locale)}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
        {notice ? (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-sm font-medium text-sky-900"
            >
              {t("dismiss", locale)}
            </button>
          </div>
        ) : null}
        <h3 className="text-lg font-semibold text-slate-900">
          {profile.has_password ? t("change_password", locale) : t("add_password", locale)}
        </h3>
        {!profile.has_password ? (
          <p className="mt-2 text-sm text-[var(--muted)]">
            {t("add_password_description", locale)}
          </p>
        ) : null}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {profile.has_password ? (
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-slate-800">
                {t("current_password", locale)}
              </label>
              <input
                type="password"
                value={passwordForm.current_password}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    current_password: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </div>
          ) : (
            <p className="sm:col-span-2 text-sm text-[var(--muted)]">
              {t("set_password_notice", locale)}
            </p>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">
              {profile.has_password ? t("new_password", locale) : t("add_password", locale)}
            </label>
            <input
              type="password"
              value={passwordForm.new_password}
              onChange={(event) =>
                setPasswordForm((current) => ({
                  ...current,
                  new_password: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">
              {t("confirm_new_password", locale)}
            </label>
            <input
              type="password"
              value={passwordForm.confirm_new_password}
              onChange={(event) =>
                setPasswordForm((current) => ({
                  ...current,
                  confirm_new_password: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
          </div>
        </div>

        {passwordState === "success" ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {profile.has_password
              ? t("password_changed_success", locale)
              : t("password_set_success", locale)}
          </div>
        ) : null}

        {passwordState === "error" || passwordState === "mismatch" || passwordState === "short" || passwordState === "same_password" || passwordState === "current_password_incorrect" ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {passwordState === "mismatch"
              ? t("passwords_do_not_match", locale)
              : passwordState === "short"
                ? t("password_too_short", locale)
                : passwordState === "current_password_incorrect"
                  ? "Current password is incorrect."
                : passwordState === "same_password"
                  ? t("new_password_must_be_different", locale)
                : profile.has_password
                  ? t("failed_to_change_password", locale)
                  : t("failed_to_set_password", locale)}
          </div>
        ) : null}

        <div className="mt-5">
          <button
            type="button"
            onClick={() => void handlePasswordSave()}
            disabled={
              (!profile.has_password && (!passwordForm.new_password || !passwordForm.confirm_new_password)) ||
              (profile.has_password &&
                (!passwordForm.current_password ||
                  !passwordForm.new_password ||
                  !passwordForm.confirm_new_password)) ||
              passwordState === "saving"
            }
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {t("save_changes", locale)}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">
          {t("delete_account", locale)}
        </h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {t("delete_account_description", locale)}
        </p>

        {deleteState === "error" ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {t("failed_to_delete_account", locale)}
          </div>
        ) : null}

        <div className="mt-5">
          <button
            type="button"
            onClick={() => setIsDeleteConfirmOpen(true)}
            disabled={deleteState === "deleting"}
            className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
          >
            {deleteState === "deleting"
              ? t("deleting_account", locale)
              : t("delete_account", locale)}
          </button>
        </div>
      </div>
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title={t("delete_account_confirm_title", locale)}
        description={t("delete_account_confirm", locale)}
        confirmLabel={t("delete_account", locale)}
        cancelLabel={t("cancel", locale)}
        tone="danger"
        isSubmitting={deleteState === "deleting"}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => void handleDeleteAccount()}
      />
    </section>
  );
}
