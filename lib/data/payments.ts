import { createClient } from "@/lib/supabase/server";
import type { PaymentHistoryFilters } from "@/lib/types";

function localTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function fetchTodayPayments() {
  const supabase = await createClient();
  const today = localTodayString();

  const { data, error } = await supabase
    .from("payments")
    .select("*, players(nom, prenom, annee_naissance)")
    .order("date_paiement", { ascending: false });

  if (error) return { payments: [], total: 0, date: today, error: error.message };

  const payments = (data ?? []).filter((p) => {
    const d = new Date(p.date_paiement);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return key === today;
  });

  const total = payments.reduce((s, p) => s + Number(p.montant), 0);
  return { payments, total, date: today, error: null };
}

export async function fetchPaymentHistory(filters: PaymentHistoryFilters) {
  const supabase = await createClient();

  let query = supabase
    .from("payments")
    .select("*, players(nom, prenom, annee_naissance), app_users(nom, prenom)")
    .order("date_paiement", { ascending: false })
    .limit(500);

  if (filters.joueurId) query = query.eq("player_id", filters.joueurId);
  if (filters.categorie) {
    const { data: categoryPlayers } = await supabase
      .from("players")
      .select("id")
      .eq("annee_naissance", filters.categorie);
    const ids = (categoryPlayers ?? []).map((p) => p.id);
    if (ids.length === 0) return { payments: [], error: null };
    query = query.in("player_id", ids);
  }
  if (filters.mois) query = query.eq("mois", filters.mois);
  if (filters.annee) query = query.eq("annee", filters.annee);
  if (filters.numeroRecu) query = query.ilike("numero_recu", `%${filters.numeroRecu}%`);

  const { data, error } = await query;
  if (error) return { payments: [], error: error.message };

  let payments = data ?? [];

  if (filters.datePaiement) {
    payments = payments.filter((p) => {
      const d = new Date(p.date_paiement);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return key === filters.datePaiement;
    });
  }

  return { payments, error: null };
}
