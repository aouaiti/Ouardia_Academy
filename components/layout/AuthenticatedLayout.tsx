import { getSessionUser } from "@/lib/auth";
import { fetchAppSettings } from "@/lib/data/dashboard";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeInjector } from "@/components/layout/ThemeInjector";
import { redirect } from "next/navigation";

export async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const settings = await fetchAppSettings();

  return (
    <>
      <ThemeInjector settings={settings} />
      <AppShell user={session.profile} settings={settings}>
        {children}
      </AppShell>
    </>
  );
}
