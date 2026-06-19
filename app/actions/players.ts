"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { PlayerStatus } from "@/lib/types";

export async function createPlayer(data: {
  nom: string;
  prenom: string;
  annee_naissance: number;
  entraineur_id?: string;
  telephone?: string;
  tarif_mensuel?: number;
  mois_inscription?: number;
  annee_inscription?: number;
}) {
  await requirePermission("managePlayers");
  const supabase = await createClient();

  const now = new Date();
  const moisInscription = data.mois_inscription ?? now.getMonth() + 1;
  const anneeInscription = data.annee_inscription ?? now.getFullYear();
  const dateInscription = `${anneeInscription}-${String(moisInscription).padStart(2, "0")}-01`;

  const { data: player, error } = await supabase
    .from("players")
    .insert({
      nom: data.nom,
      prenom: data.prenom,
      annee_naissance: data.annee_naissance,
      entraineur_id: data.entraineur_id || null,
      telephone: data.telephone || null,
      tarif_mensuel: data.tarif_mensuel ?? 40,
      date_inscription: dateInscription,
      mois_inscription: moisInscription,
      annee_inscription: anneeInscription,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  await logAudit("ajout_joueur", "players", player.id, { joueur: data });
  revalidatePath("/dashboard");
  revalidatePath("/admin/joueurs");
  return { success: true, player };
}

export async function updatePlayer(
  id: string,
  data: Partial<{
    nom: string;
    prenom: string;
    annee_naissance: number;
    entraineur_id: string | null;
    telephone: string;
    tarif_mensuel: number;
    statut: PlayerStatus;
    mois_inscription: number;
    annee_inscription: number;
  }>
) {
  await requirePermission("managePlayers");
  const supabase = await createClient();

  const updateData = { ...data } as Record<string, unknown>;
  if (data.mois_inscription !== undefined && data.annee_inscription !== undefined) {
    updateData.date_inscription = `${data.annee_inscription}-${String(data.mois_inscription).padStart(2, "0")}-01`;
  }

  const { data: before } = await supabase.from("players").select("*").eq("id", id).single();
  const { error } = await supabase.from("players").update(updateData).eq("id", id);
  if (error) return { error: error.message };

  await logAudit("modif_joueur", "players", id, { avant: before, apres: data });
  revalidatePath("/dashboard");
  revalidatePath("/admin/joueurs");
  return { success: true };
}

export async function deactivatePlayer(id: string) {
  return updatePlayer(id, { statut: "inactif" });
}

export async function activatePlayer(id: string) {
  return updatePlayer(id, { statut: "actif" });
}

export async function bulkReassignTrainer(anneeNaissance: number, entraineurId: string) {
  await requirePermission("bulkReassignTrainer");
  const supabase = await createClient();

  const { data: players } = await supabase
    .from("players")
    .select("id")
    .eq("annee_naissance", anneeNaissance)
    .eq("statut", "actif");

  const { error } = await supabase
    .from("players")
    .update({ entraineur_id: entraineurId })
    .eq("annee_naissance", anneeNaissance)
    .eq("statut", "actif");

  if (error) return { error: error.message };

  await logAudit("reaffectation_entraineur", "players", null, {
    annee_naissance: anneeNaissance,
    entraineur_id: entraineurId,
    nb_joueurs: players?.length ?? 0,
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin/joueurs");
  return { success: true, count: players?.length ?? 0 };
}
