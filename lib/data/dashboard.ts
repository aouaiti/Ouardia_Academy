import { createClient } from "@/lib/supabase/server";
import {
  computeMonthlyExpected,
  computePeriodStats,
  computePlayerFinancials,
} from "@/lib/calculations";
import type { DashboardFilters, PlayerRow } from "@/lib/types";
import type { AppSettings } from "@/lib/types";

const DEFAULT_SETTINGS: AppSettings = {
  id: 1,
  app_name: "Académie de Football",
  app_description: "Encaissement",
  logo_url: null,
  primary_color: "#166534",
  primary_dark: "#14532d",
  primary_light: "#22c55e",
  updated_at: new Date().toISOString(),
};

export async function fetchAppSettings(): Promise<AppSettings> {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();
  return (data as AppSettings) ?? DEFAULT_SETTINGS;
}

function getCalcStart(filters: DashboardFilters) {
  return {
    mois: filters.calcMois ?? 1,
    annee: filters.calcAnnee ?? filters.annee,
  };
}

export async function fetchDashboardData(filters: DashboardFilters) {
  const supabase = await createClient();
  const calcStart = getCalcStart(filters);
  const periodEnd = { mois: filters.mois, annee: filters.annee };

  let playersQuery = supabase
    .from("players")
    .select("*, trainers(id, nom, prenom)")
    .eq("statut", "actif")
    .order("nom");

  if (filters.anneeNaissance) playersQuery = playersQuery.eq("annee_naissance", filters.anneeNaissance);
  if (filters.joueurId) playersQuery = playersQuery.eq("id", filters.joueurId);
  if (filters.entraineurId) playersQuery = playersQuery.eq("entraineur_id", filters.entraineurId);

  const [{ data: players }, { data: periodPayments }, { data: allPaymentsInRange }] = await Promise.all([
    playersQuery,
    supabase
      .from("payments")
      .select("*, app_users(nom, prenom)")
      .eq("mois", filters.mois)
      .eq("annee", filters.annee),
    supabase
      .from("payments")
      .select("*")
      .gte("annee", Math.min(calcStart.annee, filters.annee))
      .lte("annee", filters.annee),
  ]);

  const paymentMap = new Map((periodPayments ?? []).map((p) => [p.player_id, p]));
  const payments = allPaymentsInRange ?? [];

  let rows: PlayerRow[] = (players ?? []).map((player) => {
    const payment = paymentMap.get(player.id) ?? null;
    const financials = computePlayerFinancials(player, payments, calcStart, periodEnd);
    return { ...player, payment, paye: !!payment, financials };
  });

  if (filters.statut === "paye") rows = rows.filter((r) => r.paye);
  if (filters.statut === "non_paye") rows = rows.filter((r) => !r.paye);

  if (filters.datePaiement) {
    rows = rows.filter((r) => {
      if (!r.payment) return false;
      return new Date(r.payment.date_paiement).toISOString().slice(0, 10) === filters.datePaiement;
    });
  }

  const totalEncaisse = rows.filter((r) => r.paye).reduce((s, r) => s + Number(r.payment?.montant ?? 0), 0);
  const totalAttenduMois = computeMonthlyExpected(players ?? [], filters.annee, filters.mois);
  const periodStats = computePeriodStats(players ?? [], payments, calcStart, periodEnd);
  const nbPayes = rows.filter((r) => r.paye).length;
  const nbNonPayes = rows.filter((r) => !r.paye).length;

  return {
    rows,
    stats: {
      totalEncaisse,
      totalAttendu: totalAttenduMois,
      nbPayes,
      nbNonPayes,
      periodTotalDu: periodStats.totalDu,
      periodTotalPaye: periodStats.totalPaye,
      periodTotalDette: periodStats.totalDette,
    },
    calcStart,
  };
}

export async function fetchYearStats(
  annee: number,
  calcStart: { mois: number; annee: number }
) {
  const supabase = await createClient();
  const now = new Date();
  const endMois = annee === now.getFullYear() ? now.getMonth() + 1 : 12;
  const periodEnd = { mois: endMois, annee };

  const [{ data: players }, { data: payments }] = await Promise.all([
    supabase.from("players").select("*").eq("statut", "actif"),
    supabase.from("payments").select("montant, mois, annee, player_id").eq("annee", annee),
  ]);

  const periodStats = computePeriodStats(players ?? [], payments ?? [], calcStart, periodEnd);

  const monthly = Array.from({ length: 12 }, (_, i) => {
    const mois = i + 1;
    const encaisse = (payments ?? [])
      .filter((p) => p.mois === mois)
      .reduce((s, p) => s + Number(p.montant), 0);
    const attendu = computeMonthlyExpected(players ?? [], annee, mois);
    return { mois, montant: encaisse, attendu };
  });

  return {
    totalEncaisse: periodStats.totalPaye,
    totalAttendu: periodStats.totalDu,
    totalDette: periodStats.totalDette,
    monthly,
    effectif: players?.length ?? 0,
  };
}

export async function fetchFilterOptions() {
  const supabase = await createClient();

  const [{ data: players }, { data: trainers }, { data: categories }] = await Promise.all([
    supabase.from("players").select("id, nom, prenom").eq("statut", "actif").order("nom"),
    supabase.from("trainers").select("id, nom, prenom").eq("actif", true).order("nom"),
    supabase.from("players").select("annee_naissance").eq("statut", "actif"),
  ]);

  const uniqueCategories = [...new Set((categories ?? []).map((c) => c.annee_naissance))].sort((a, b) => b - a);

  return { players: players ?? [], trainers: trainers ?? [], categories: uniqueCategories };
}

export async function fetchUserShortcuts(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("filter_shortcuts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
