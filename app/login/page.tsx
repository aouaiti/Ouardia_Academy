import type { Metadata } from "next";
import { fetchAppSettings } from "@/lib/data/dashboard";
import { ThemeInjector } from "@/components/layout/ThemeInjector";
import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchAppSettings();
  return {
    title: `${settings.app_name} — Connexion`,
    description: settings.app_description,
  };
}

export default async function LoginPage() {
  const settings = await fetchAppSettings();

  return (
    <>
      <ThemeInjector settings={settings} />
      <LoginForm settings={settings} />
    </>
  );
}
