import { createClient } from "@/lib/supabase/server";
import type { PaymentHistoryFilters } from "@/lib/types";

export async function fetchPaymentHistory(filters: PaymentHistoryFilters) {
  const supabase = await createClient();

  let query = supabase
    .from("payments")
    .select("*, players(nom, prenom, annee_naissance), app_users(nom, prenom)")
    .order("date_paiement", { ascending: false })
    .limit(500);

  if (filters.joueurId) query = query.eq("player_id", filters.joueurId);
  if (filters.mois) query = query.eq("mois", filters.mois);
  if (filters.annee) query = query.eq("annee", filters.annee);
  if (filters.numeroRecu) query = query.ilike("numero_recu", `%${filters.numeroRecu}%`);

  const { data, error } = await query;
  if (error) return { payments: [], error: error.message };

  let payments = data ?? [];

  if (filters.datePaiement) {
    payments = payments.filter((p) => {
      const d = new Date(p.date_paiement).toISOString().slice(0, 10);
      return d === filters.datePaiement;
    });
  }

  return { payments, error: null };
}
