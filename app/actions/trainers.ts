"use server";

import { createClient } from "@/lib/supabase/server";
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
