import type { Metadata } from "next";
import { fetchAppSettings } from "@/lib/data/dashboard";
import { ThemeInjector } from "@/components/layout/ThemeInjector";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchAppSettings();
  return {
    title: `${settings.app_name} — Mot de passe oublié`,
    description: settings.app_description,
  };
}

export default async function ForgotPasswordPage() {
  const settings = await fetchAppSettings();

  return (
    <>
      <ThemeInjector settings={settings} />
      <ForgotPasswordForm settings={settings} />
    </>
  );
}
