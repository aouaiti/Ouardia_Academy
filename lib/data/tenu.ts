import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TENU_PRIX } from "@/lib/types";
import type { TenuDashboardFilters, TenuPaymentHistoryFilters, TenuPlayerRow, TenuStats } from "@/lib/types";

function localTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function fetchTenuDashboardData(filters: TenuDashboardFilters) {
  const supabase = await createClient();

  let playersQuery = supabase
    .from("players")
    .select("*, trainers(id, nom, prenom)")
    .eq("statut", "actif")
    .order("nom");

  if (filters.anneeNaissance) playersQuery = playersQuery.eq("annee_naissance", filters.anneeNaissance);
  if (filters.joueurId) playersQuery = playersQuery.eq("id", filters.joueurId);
  if (filters.entraineurId) playersQuery = playersQuery.eq("entraineur_id", filters.entraineurId);

  const [{ data: players }, { data: tenuRecords }, { data: allPayments }] = await Promise.all([
    playersQuery,
    supabase.from("player_tenu").select("*"),
    supabase.from("tenu_payments").select("player_id, montant, date_paiement"),
  ]);

  const tenuMap = new Map((tenuRecords ?? []).map((t) => [t.player_id, Number(t.prix)]));
  const paidByPlayer = new Map<string, number>();
  for (const p of allPayments ?? []) {
    paidByPlayer.set(p.player_id, (paidByPlayer.get(p.player_id) ?? 0) + Number(p.montant));
  }

  let rows: TenuPlayerRow[] = (players ?? []).map((player) => {
    const prix = tenuMap.get(player.id) ?? DEFAULT_TENU_PRIX;
    const totalPaye = paidByPlayer.get(player.id) ?? 0;
    const reste = Math.max(0, prix - totalPaye);
    const paye = totalPaye >= prix;
    const partiel = totalPaye > 0 && !paye;
    return { ...player, prix, totalPaye, reste, paye, partiel };
  });

  if (filters.statut === "paye") rows = rows.filter((r) => r.paye);
  if (filters.statut === "non_paye") rows = rows.filter((r) => !r.paye && !r.partiel);
  if (filters.statut === "partiel") rows = rows.filter((r) => r.partiel);

  if (filters.datePaiement) {
    const paidToday = new Set(
      (allPayments ?? [])
        .filter((p) => {
          const d = new Date(p.date_paiement);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          return key === filters.datePaiement;
        })
        .map((p) => p.player_id)
    );
    rows = rows.filter((r) => paidToday.has(r.id));
  }

  const stats: TenuStats = {
    totalEncaisse: rows.reduce((s, r) => s + r.totalPaye, 0),
    totalAttendu: rows.reduce((s, r) => s + r.prix, 0),
    nbPayes: rows.filter((r) => r.paye).length,
    nbPartiels: rows.filter((r) => r.partiel).length,
    nbNonPayes: rows.filter((r) => !r.paye && !r.partiel).length,
    totalReste: rows.reduce((s, r) => s + r.reste, 0),
  };

  return { rows, stats };
}

export async function fetchTenuPaymentHistory(filters: TenuPaymentHistoryFilters) {
  const supabase = await createClient();

  let query = supabase
    .from("tenu_payments")
    .select("*, players(nom, prenom, annee_naissance), app_users(nom, prenom)")
    .order("date_paiement", { ascending: false })
    .limit(500);

  if (filters.joueurId) query = query.eq("player_id", filters.joueurId);
  if (filters.categorie || filters.entraineurId) {
    let playerQuery = supabase.from("players").select("id");
    if (filters.categorie) playerQuery = playerQuery.eq("annee_naissance", filters.categorie);
    if (filters.entraineurId) playerQuery = playerQuery.eq("entraineur_id", filters.entraineurId);
    const { data: filteredPlayers } = await playerQuery;
    const ids = (filteredPlayers ?? []).map((p) => p.id);
    if (ids.length === 0) return { payments: [], error: null };
    query = query.in("player_id", ids);
  }
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

export async function fetchTodayTenuPayments() {
  const supabase = await createClient();
  const today = localTodayString();

  const { data, error } = await supabase
    .from("tenu_payments")
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

export async function fetchPlayerTenuSummary(playerId: string) {
  const supabase = await createClient();

  const [{ data: tenu }, { data: payments }] = await Promise.all([
    supabase.from("player_tenu").select("prix").eq("player_id", playerId).maybeSingle(),
    supabase.from("tenu_payments").select("montant").eq("player_id", playerId),
  ]);

  const prix = Number(tenu?.prix ?? DEFAULT_TENU_PRIX);
  const totalPaye = (payments ?? []).reduce((s, p) => s + Number(p.montant), 0);
  const reste = Math.max(0, prix - totalPaye);
  const paye = totalPaye >= prix;

  return { prix, totalPaye, reste, paye };
}

export async function fetchAllPlayerTenuSummaries(playerIds: string[]) {
  if (playerIds.length === 0) return {};

  const supabase = await createClient();
  const [{ data: tenuRecords }, { data: payments }] = await Promise.all([
    supabase.from("player_tenu").select("player_id, prix").in("player_id", playerIds),
    supabase.from("tenu_payments").select("player_id, montant").in("player_id", playerIds),
  ]);

  const tenuMap = new Map((tenuRecords ?? []).map((t) => [t.player_id, Number(t.prix)]));
  const paidByPlayer = new Map<string, number>();
  for (const p of payments ?? []) {
    paidByPlayer.set(p.player_id, (paidByPlayer.get(p.player_id) ?? 0) + Number(p.montant));
  }

  const summaries: Record<string, { prix: number; totalPaye: number; reste: number; paye: boolean }> = {};
  for (const id of playerIds) {
    const prix = tenuMap.get(id) ?? DEFAULT_TENU_PRIX;
    const totalPaye = paidByPlayer.get(id) ?? 0;
    const reste = Math.max(0, prix - totalPaye);
    summaries[id] = { prix, totalPaye, reste, paye: totalPaye >= prix };
  }
  return summaries;
}
