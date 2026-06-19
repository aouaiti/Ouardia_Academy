"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { generateReceiptNumber } from "@/lib/format";
import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createPayment(playerId: string, mois: number, annee: number) {
  const { profile } = await requirePermission("recordPayment");
  const supabase = await createClient();

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("tarif_mensuel, nom, prenom")
    .eq("id", playerId)
    .single();

  if (playerError || !player) {
    return { error: "Joueur introuvable" };
  }

  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("player_id", playerId)
    .eq("mois", mois)
    .eq("annee", annee)
    .maybeSingle();

  if (existing) {
    return { error: "Ce mois est déjà payé pour ce joueur" };
  }

  const numeroRecu = generateReceiptNumber();
  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      player_id: playerId,
      mois,
      annee,
      montant: player.tarif_mensuel,
      enregistre_par: profile.id,
      numero_recu: numeroRecu,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Ce mois est déjà payé pour ce joueur" };
    return { error: error.message };
  }

  await logAudit("creation_paiement", "payments", payment.id, {
    player_id: playerId,
    mois,
    annee,
    montant: player.tarif_mensuel,
    numero_recu: numeroRecu,
  });

  revalidatePath("/dashboard");
  revalidatePath("/paiement");

  return {
    success: true,
    payment,
    receipt: {
      numeroRecu,
      joueurNom: player.nom,
      joueurPrenom: player.prenom,
      mois,
      annee,
      montant: Number(player.tarif_mensuel),
      datePaiement: payment.date_paiement,
    },
  };
}

export async function deletePayment(paymentId: string) {
  await requirePermission("deletePayment");
  const supabase = await createClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .single();

  if (!payment) return { error: "Paiement introuvable" };

  const { error } = await supabase.from("payments").delete().eq("id", paymentId);
  if (error) return { error: error.message };

  await logAudit("suppression_paiement", "payments", paymentId, { avant: payment });
  revalidatePath("/dashboard");
  revalidatePath("/paiement");
  return { success: true };
}

export async function updatePlayerRate(playerId: string, tarif: number) {
  await requirePermission("modifyPlayerRate");
  const supabase = await createClient();

  const { data: before } = await supabase.from("players").select("tarif_mensuel").eq("id", playerId).single();
  const { error } = await supabase.from("players").update({ tarif_mensuel: tarif }).eq("id", playerId);
  if (error) return { error: error.message };

  await logAudit("modif_tarif_joueur", "players", playerId, {
    avant: before?.tarif_mensuel,
    apres: tarif,
  });
  revalidatePath("/paiement");
  revalidatePath("/admin/joueurs");
  return { success: true };
}
