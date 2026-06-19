import { fetchAppSettings } from "@/lib/data/dashboard";
import { ThemeInjector } from "@/components/layout/ThemeInjector";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage() {
  const settings = await fetchAppSettings();

  return (
    <>
      <ThemeInjector settings={settings} />
      <LoginForm settings={settings} />
    </>
  );
}
