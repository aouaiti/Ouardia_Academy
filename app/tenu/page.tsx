import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { TenuClient } from "@/components/tenu/TenuClient";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { fetchFilterOptions, fetchAppSettings } from "@/lib/data/dashboard";
import {
  fetchTenuDashboardData,
  fetchTenuPaymentHistory,
  fetchTodayTenuPayments,
  fetchAllPlayerTenuSummaries,
} from "@/lib/data/tenu";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { TenuDashboardFilters, TenuPaymentHistoryFilters } from "@/lib/types";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function TenuPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const canView =
    hasPermission(session.profile.role, "recordPayment") ||
    hasPermission(session.profile.role, "deletePayment") ||
    hasPermission(session.profile.role, "modifyPlayerRate") ||
    hasPermission(session.profile.role, "viewDashboard");

  if (!canView) redirect("/dashboard");

  const activeTab = params.onglet === "dashboard" ? "dashboard" : "paiements";

  const historyFilters: TenuPaymentHistoryFilters = {
    joueurId: params.joueur,
    categorie: params.categorie ? Number(params.categorie) : undefined,
    datePaiement: params.datePaiement,
    numeroRecu: params.numeroRecu,
  };

  const dashboardFilters: TenuDashboardFilters = {
    statut: params.statut as TenuDashboardFilters["statut"],
    anneeNaissance: params.categorie ? Number(params.categorie) : undefined,
    joueurId: params.joueur,
    entraineurId: params.entraineur,
    datePaiement: params.datePaiement,
  };

  const supabase = await createClient();
  const [{ data: players }, { payments }, { rows, stats }, filterOptions, todayReport, settings] =
    await Promise.all([
      supabase.from("players").select("*").eq("statut", "actif").order("nom"),
      fetchTenuPaymentHistory(historyFilters),
      fetchTenuDashboardData(dashboardFilters),
      fetchFilterOptions(),
      fetchTodayTenuPayments(),
      fetchAppSettings(),
    ]);

  const playerList = players ?? [];
  const playerSummaries = await fetchAllPlayerTenuSummaries(playerList.map((p) => p.id));

  return (
    <AuthenticatedLayout>
      <TenuClient
        activeTab={activeTab}
        players={playerList}
        existingPayments={(payments ?? []) as never}
        historyFilters={historyFilters}
        playerSummaries={playerSummaries}
        dashboardRows={rows}
        dashboardStats={stats}
        dashboardFilters={dashboardFilters}
        filterOptions={filterOptions}
        todayPayments={todayReport.payments}
        todayTotal={todayReport.total}
        todayDate={todayReport.date}
        role={session.profile.role}
        appName={settings.app_name}
      />
    </AuthenticatedLayout>
  );
}
