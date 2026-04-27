"use client";

import { useEffect, useState } from "react";

import { ProfileTab } from "@/components/settings/ProfileTab";
import { SecurityTab } from "@/components/settings/SecurityTab";
import { getUserProfile } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import type { UserResponse } from "@/types";

type SettingsTab = "profile" | "security";

const tabKeys: SettingsTab[] = ["profile", "security"];

export default function SettingsPage() {
  const { locale } = useLanguage();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [profile, setProfile] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setLoading(true);
      setError(null);

      try {
        const profileData = await getUserProfile();

        if (!isMounted) {
          return;
        }

        setProfile(profileData);
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

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">
          {t("settings", locale)}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {t("manage_profile_security", locale)}
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-[var(--border)] bg-white p-3 shadow-sm">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {tabKeys.map((tabKey) => {
              const isActive = activeTab === tabKey;

              return (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setActiveTab(tabKey)}
                  className={`rounded-xl px-4 py-3 text-start text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "border border-[var(--border)] bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {t(tabKey, locale)}
                </button>
              );
            })}
          </div>
        </aside>

        <div>
          {loading ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-slate-50 px-4 py-10 text-center text-sm text-[var(--muted)]">
              {t("loading_dashboard", locale)}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {t("failed_to_load_profile", locale)}
            </div>
          ) : null}

          {!loading && profile ? (
            activeTab === "profile" ? (
              <ProfileTab profile={profile} onProfileUpdated={setProfile} />
            ) : (
              <SecurityTab profile={profile} onProfileUpdated={setProfile} />
            )
          ) : null}
        </div>
      </section>
    </div>
  );
}
