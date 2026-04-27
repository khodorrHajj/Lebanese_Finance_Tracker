"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { TwoFactorModal } from "@/components/TwoFactorModal";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";

interface AuthCallbackClientProps {
  accessToken: string | null;
  refreshToken: string | null;
  tempToken: string | null;
  requiresTwoFactor: boolean;
  errorCode: string | null;
}

export function AuthCallbackClient({
  accessToken,
  refreshToken,
  tempToken,
  requiresTwoFactor,
  errorCode,
}: AuthCallbackClientProps) {
  const router = useRouter();
  const { locale } = useLanguage();
  const { completeSession } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pendingTempToken, setPendingTempToken] = useState<string | null>(null);
  const processedCallbackRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function finalizeGoogleLogin() {
      if (processedCallbackRef.current) {
        return;
      }

      if (errorCode) {
        if (isMounted) {
          setError(errorCode);
        }
        return;
      }

      if (requiresTwoFactor && tempToken) {
        processedCallbackRef.current = true;
        setPendingTempToken(tempToken);
        return;
      }

      if (!accessToken || !refreshToken) {
        if (isMounted) {
          setError("missing_tokens");
        }
        return;
      }

      processedCallbackRef.current = true;

      try {
        await completeSession({
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: "bearer",
        });
        router.replace("/dashboard");
      } catch {
        if (isMounted) {
          setError("missing_tokens");
        }
      }
    }

    void finalizeGoogleLogin();

    return () => {
      isMounted = false;
    };
  }, [
    accessToken,
    completeSession,
    errorCode,
    refreshToken,
    requiresTwoFactor,
    router,
    tempToken,
  ]);

  function handleTwoFactorClose() {
    setPendingTempToken(null);
    router.replace("/login");
  }

  return (
    <>
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          {!pendingTempToken ? (
            <LoaderCircle className="h-8 w-8 animate-spin text-slate-700" />
          ) : null}
          <p className="text-sm text-[var(--muted)]">
            {error
              ? t("invalid_google_callback", locale)
              : pendingTempToken
                ? t("two_factor_description", locale)
                : t("completing_login", locale)}
          </p>
        </div>
      </main>

      <TwoFactorModal
        isOpen={Boolean(pendingTempToken)}
        tempToken={pendingTempToken}
        onClose={handleTwoFactorClose}
        onVerified={() => {
          setPendingTempToken(null);
          router.replace("/dashboard");
        }}
      />
    </>
  );
}
