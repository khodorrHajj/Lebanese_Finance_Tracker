import { LoginPageClient } from "@/components/LoginPageClient";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const params = await searchParams;

  return <LoginPageClient registered={params.registered === "1"} />;
}
