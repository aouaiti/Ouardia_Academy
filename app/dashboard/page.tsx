import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { getSessionUser } from "@/lib/auth";
import {
  fetchDashboardData,
  fetchFilterOptions,
  fetchUserShortcuts,
  fetchYearStats,
  fetchAppSettings,
} from "@/lib/data/dashboard";
import { fetchTodayPayments } from "@/lib/data/payments";
import type { DashboardFilters } from "@/lib/types";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const now = new Date();

  const filters: DashboardFilters = {
    mois: params.mois ? Number(params.mois) : now.getMonth() + 1,
    annee: params.annee ? Number(params.annee) : now.getFullYear(),
    calcMois: params.calcMois ? Number(params.calcMois) : 1,
    calcAnnee: params.calcAnnee ? Number(params.calcAnnee) : (params.annee ? Number(params.annee) : now.getFullYear()),
    statut: params.statut as DashboardFilters["statut"],
    anneeNaissance: params.categorie ? Number(params.categorie) : undefined,
    joueurId: params.joueur,
    entraineurId: params.entraineur,
    datePaiement: params.datePaiement,
  };

  const calcStart = { mois: filters.calcMois ?? 1, annee: filters.calcAnnee ?? filters.annee };

  const session = await getSessionUser();
  const [{ rows, stats }, yearStats, filterOptions, shortcuts, todayReport, settings] = await Promise.all([
    fetchDashboardData(filters),
    fetchYearStats(filters.annee, calcStart),
    fetchFilterOptions(),
    session ? fetchUserShortcuts(session.profile.id) : Promise.resolve([]),
    fetchTodayPayments(),
    fetchAppSettings(),
  ]);

  return (
    <AuthenticatedLayout>
      <DashboardClient
        initialRows={rows}
        initialStats={stats}
        yearStats={yearStats}
        calcStart={calcStart}
        filterOptions={filterOptions}
        shortcuts={shortcuts as { id: string; nom: string; filtres: DashboardFilters }[]}
        defaultFilters={filters}
        todayPayments={todayReport.payments}
        todayTotal={todayReport.total}
        todayDate={todayReport.date}
        appName={settings.app_name}
      />
    </AuthenticatedLayout>
  );
}
