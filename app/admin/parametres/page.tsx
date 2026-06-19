import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { SettingsClient } from "@/components/admin/SettingsClient";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { fetchAppSettings } from "@/lib/data/dashboard";
import { redirect } from "next/navigation";

export default async function ParametresPage() {
  const session = await getSessionUser();
  if (!session || !hasPermission(session.profile.role, "manageSettings")) {
    redirect("/dashboard");
  }

  const settings = await fetchAppSettings();

  return (
    <AuthenticatedLayout>
      <SettingsClient settings={settings} />
    </AuthenticatedLayout>
  );
}
