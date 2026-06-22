"use server";

import { createClient } from "@/lib/supabase/server";
import { getAdminClientSafe } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createTrainer(data: { nom: string; prenom: string; telephone?: string }) {
  await requirePermission("addTrainers");
  const supabase = await createClient();

  const { data: trainer, error } = await supabase
    .from("trainers")
    .insert({
      nom: data.nom,
      prenom: data.prenom,
      telephone: data.telephone || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  await logAudit("ajout_entraineur", "trainers", trainer.id, { entraineur: data });
  revalidatePath("/admin/entraineurs");
  return { success: true, trainer };
}

export async function updateTrainer(
  id: string,
  data: Partial<{ nom: string; prenom: string; telephone: string; actif: boolean }>
) {
  await requirePermission("manageTrainers");
  const supabase = await createClient();

  const { data: before } = await supabase.from("trainers").select("*").eq("id", id).single();
  const { error } = await supabase.from("trainers").update(data).eq("id", id);
  if (error) return { error: error.message };

  await logAudit("modif_entraineur", "trainers", id, { avant: before, apres: data });
  revalidatePath("/admin/entraineurs");
  return { success: true };
}

export async function deactivateTrainer(id: string) {
  return updateTrainer(id, { actif: false });
}

export async function activateTrainer(id: string) {
  return updateTrainer(id, { actif: true });
}

export async function deleteTrainer(id: string) {
  await requirePermission("manageTrainers");
  const supabase = await createClient();

  const { data: before } = await supabase.from("trainers").select("*").eq("id", id).single();
  if (!before) return { error: "Entraîneur introuvable." };

  const adminResult = getAdminClientSafe();
  const db = "admin" in adminResult ? adminResult.admin : supabase;

  const { error: detachError } = await db
    .from("players")
    .update({ entraineur_id: null })
    .eq("entraineur_id", id);
  if (detachError) return { error: detachError.message };

  const { data: deleted, error } = await db.from("trainers").delete().eq("id", id).select("id");
  if (error) return { error: error.message };
  if (!deleted?.length) {
    return {
      error:
        "Suppression refusée. Exécutez la migration 005 dans Supabase ou configurez SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  await logAudit("suppression_entraineur", "trainers", id, {
    avant: before,
    joueurs_detaches: true,
  });
  revalidatePath("/dashboard");
  revalidatePath("/admin/entraineurs");
  revalidatePath("/admin/joueurs");
  return { success: true };
}
