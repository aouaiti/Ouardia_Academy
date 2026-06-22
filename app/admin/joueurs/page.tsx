import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { PlayersAdminClient } from "@/components/admin/PlayersAdminClient";
import { getSessionUser } from "@/lib/auth";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function JoueursPage() {
  const session = await getSessionUser();
  if (!session || !hasAnyPermission(session.profile.role, ["managePlayers", "addPlayers"])) {
    redirect("/dashboard");
  }

  const canManage = hasPermission(session.profile.role, "managePlayers");
  const canAdd = hasPermission(session.profile.role, "addPlayers");

  const supabase = await createClient();
  const [{ data: players }, { data: trainers }, { data: categories }] = await Promise.all([
    supabase.from("players").select("*, trainers(id, nom, prenom)").order("nom"),
    supabase.from("trainers").select("*").order("nom"),
    supabase.from("players").select("annee_naissance").eq("statut", "actif"),
  ]);

  const uniqueCategories = [...new Set((categories ?? []).map((c) => c.annee_naissance))].sort((a, b) => b - a);

  return (
    <AuthenticatedLayout>
      <PlayersAdminClient
        players={(players ?? []) as never}
        trainers={trainers ?? []}
        categories={uniqueCategories}
        canManage={canManage}
        canAdd={canAdd}
        role={session.profile.role}
      />
    </AuthenticatedLayout>
  );
}
