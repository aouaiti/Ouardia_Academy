"use server";

import { createClient } from "@/lib/supabase/server";
import { getAdminClientSafe } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { PlayerStatus } from "@/lib/types";

type ImportedPlayerRow = {
  nom: string;
  prenom: string;
  annee_naissance: number;
  telephone?: string;
  tarif_mensuel?: number;
  mois_inscription?: number;
  annee_inscription?: number;
};

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
  await requirePermission("addPlayers");
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

export async function importPlayersCsv(rows: ImportedPlayerRow[], entraineurId: string) {
  await requirePermission("managePlayers");
  const supabase = await createClient();

  const cleanedRows = rows
    .map((row) => ({
      nom: row.nom.trim(),
      prenom: row.prenom.trim(),
      annee_naissance: Number(row.annee_naissance),
      telephone: row.telephone?.trim() || null,
      tarif_mensuel: row.tarif_mensuel !== undefined ? Number(row.tarif_mensuel) : 40,
      mois_inscription: row.mois_inscription !== undefined ? Number(row.mois_inscription) : undefined,
      annee_inscription: row.annee_inscription !== undefined ? Number(row.annee_inscription) : undefined,
    }))
    .filter((row) => row.nom && row.prenom);

  if (cleanedRows.length === 0) {
    return { error: "Le fichier CSV ne contient aucun joueur valide." };
  }

  const invalidRow = cleanedRows.find(
    (row) =>
      !Number.isInteger(row.annee_naissance) ||
      row.annee_naissance < 1900 ||
      row.annee_naissance > 2100 ||
      !Number.isFinite(row.tarif_mensuel) ||
      row.tarif_mensuel <= 0 ||
      (row.mois_inscription !== undefined &&
        (!Number.isInteger(row.mois_inscription) || row.mois_inscription < 1 || row.mois_inscription > 12)) ||
      (row.annee_inscription !== undefined &&
        (!Number.isInteger(row.annee_inscription) || row.annee_inscription < 1900 || row.annee_inscription > 2100))
  );
  if (invalidRow) {
    return { error: "Certaines lignes CSV sont invalides (année, mois ou tarif)." };
  }

  const now = new Date();
  const payload = cleanedRows.map((row) => {
    const moisInscription = row.mois_inscription ?? now.getMonth() + 1;
    const anneeInscription = row.annee_inscription ?? now.getFullYear();
    return {
      nom: row.nom,
      prenom: row.prenom,
      annee_naissance: row.annee_naissance,
      entraineur_id: entraineurId,
      telephone: row.telephone,
      tarif_mensuel: row.tarif_mensuel,
      mois_inscription: moisInscription,
      annee_inscription: anneeInscription,
      date_inscription: `${anneeInscription}-${String(moisInscription).padStart(2, "0")}-01`,
    };
  });

  const { data: inserted, error } = await supabase.from("players").insert(payload).select("id");
  if (error) return { error: error.message };

  await logAudit("import_joueurs_csv", "players", null, {
    entraineur_id: entraineurId,
    nb_joueurs: inserted?.length ?? payload.length,
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin/joueurs");
  return { success: true, count: inserted?.length ?? payload.length };
}

export async function deletePlayer(id: string) {
  await requirePermission("managePlayers");
  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("player_id", id);

  if (countError) return { error: countError.message };
  if ((count ?? 0) > 0) {
    return { error: "Impossible de supprimer ce joueur: des paiements existent. Supprimez d'abord ses paiements." };
  }

  const { data: before } = await supabase.from("players").select("*").eq("id", id).single();
  if (!before) return { error: "Joueur introuvable." };

  const adminResult = getAdminClientSafe();
  const db = "admin" in adminResult ? adminResult.admin : supabase;

  const { data: deleted, error } = await db.from("players").delete().eq("id", id).select("id");
  if (error) return { error: error.message };
  if (!deleted?.length) {
    return {
      error:
        "Suppression refusée. Exécutez la migration 005 dans Supabase ou configurez SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  await logAudit("suppression_joueur", "players", id, { avant: before });
  revalidatePath("/dashboard");
  revalidatePath("/admin/joueurs");
  return { success: true };
}
