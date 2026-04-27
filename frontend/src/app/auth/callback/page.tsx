import { AuthCallbackClient } from "@/components/AuthCallbackClient";

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{
    access_token?: string;
    refresh_token?: string;
    temp_token?: string;
    requires_2fa?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;

  return (
    <AuthCallbackClient
      accessToken={params.access_token ?? null}
      refreshToken={params.refresh_token ?? null}
      tempToken={params.temp_token ?? null}
      requiresTwoFactor={params.requires_2fa === "true"}
      errorCode={params.error ?? null}
    />
  );
}
