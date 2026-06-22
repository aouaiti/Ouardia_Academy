"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { generateTenuReceiptNumber } from "@/lib/format";
import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { DEFAULT_TENU_PRIX } from "@/lib/types";

export async function createTenuPayment(playerId: string, montant: number) {
  const { profile } = await requirePermission("recordPayment");
  const supabase = await createClient();

  if (!montant || montant <= 0) {
    return { error: "Le montant doit être supérieur à 0." };
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("nom, prenom, statut")
    .eq("id", playerId)
    .single();

  if (playerError || !player) return { error: "Joueur introuvable" };
  if (player.statut !== "actif") return { error: "Ce joueur n'est pas actif." };

  const { data: tenu } = await supabase
    .from("player_tenu")
    .select("prix")
    .eq("player_id", playerId)
    .maybeSingle();

  if (!tenu) {
    await supabase.from("player_tenu").insert({ player_id: playerId, prix: DEFAULT_TENU_PRIX });
  }

  const prix = Number(tenu?.prix ?? DEFAULT_TENU_PRIX);

  const { data: existingPayments } = await supabase
    .from("tenu_payments")
    .select("montant")
    .eq("player_id", playerId);

  const totalPaye = (existingPayments ?? []).reduce((s, p) => s + Number(p.montant), 0);
  const reste = prix - totalPaye;

  if (reste <= 0) {
    return { error: "La tenu est déjà entièrement payée pour ce joueur." };
  }
  if (montant > reste) {
    return { error: `Le montant dépasse le reste à payer (${reste.toFixed(2)} DT).` };
  }

  const numeroRecu = generateTenuReceiptNumber();
  const { data: payment, error } = await supabase
    .from("tenu_payments")
    .insert({
      player_id: playerId,
      montant,
      enregistre_par: profile.id,
      numero_recu: numeroRecu,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  const newTotal = totalPaye + montant;
  await logAudit("creation_paiement_tenu", "tenu_payments", payment.id, {
    player_id: playerId,
    montant,
    numero_recu: numeroRecu,
    total_paye: newTotal,
    prix,
    solde: prix - newTotal,
  });

  revalidatePath("/tenu");

  return {
    success: true,
    payment,
    receipt: {
      numeroRecu,
      joueurNom: player.nom,
      joueurPrenom: player.prenom,
      montant,
      datePaiement: payment.date_paiement,
      prix,
      totalPaye: newTotal,
      reste: prix - newTotal,
    },
  };
}

export async function deleteTenuPayment(paymentId: string) {
  await requirePermission("deletePayment");
  const supabase = await createClient();

  const { data: payment } = await supabase
    .from("tenu_payments")
    .select("*")
    .eq("id", paymentId)
    .single();

  if (!payment) return { error: "Paiement introuvable" };

  const { error } = await supabase.from("tenu_payments").delete().eq("id", paymentId);
  if (error) return { error: error.message };

  await logAudit("suppression_paiement_tenu", "tenu_payments", paymentId, { avant: payment });
  revalidatePath("/tenu");
  return { success: true };
}

export async function updateTenuPrice(playerId: string, prix: number) {
  await requirePermission("modifyPlayerRate");
  const supabase = await createClient();

  if (!prix || prix <= 0) return { error: "Le prix doit être supérieur à 0." };

  const { data: existing } = await supabase
    .from("player_tenu")
    .select("prix")
    .eq("player_id", playerId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("player_tenu").update({ prix }).eq("player_id", playerId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("player_tenu").insert({ player_id: playerId, prix });
    if (error) return { error: error.message };
  }

  await logAudit("modif_prix_tenu", "player_tenu", playerId, {
    avant: existing?.prix ?? DEFAULT_TENU_PRIX,
    apres: prix,
  });

  revalidatePath("/tenu");
  return { success: true };
}
