import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { TrainersAdminClient } from "@/components/admin/TrainersAdminClient";
import { getSessionUser } from "@/lib/auth";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function EntraineursPage() {
  const session = await getSessionUser();
  if (!session || !hasAnyPermission(session.profile.role, ["manageTrainers", "addTrainers"])) {
    redirect("/dashboard");
  }

  const canManage = hasPermission(session.profile.role, "manageTrainers");
  const canAdd = hasPermission(session.profile.role, "addTrainers");

  const supabase = await createClient();
  const { data: trainers } = await supabase.from("trainers").select("*").order("nom");

  return (
    <AuthenticatedLayout>
      <TrainersAdminClient trainers={trainers ?? []} canManage={canManage} canAdd={canAdd} />
    </AuthenticatedLayout>
  );
}
