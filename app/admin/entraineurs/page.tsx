import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { TrainersAdminClient } from "@/components/admin/TrainersAdminClient";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function EntraineursPage() {
  const session = await getSessionUser();
  if (!session || !hasPermission(session.profile.role, "manageTrainers")) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: trainers } = await supabase.from("trainers").select("*").order("nom");

  return (
    <AuthenticatedLayout>
      <TrainersAdminClient trainers={trainers ?? []} />
    </AuthenticatedLayout>
  );
}
