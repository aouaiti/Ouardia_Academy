"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { TenuPaymentTab } from "@/components/tenu/TenuPaymentTab";
import { TenuDashboardTab } from "@/components/tenu/TenuDashboardTab";
import type {
  Player,
  TenuDashboardFilters,
  TenuPayment,
  TenuPaymentHistoryFilters,
  TenuPlayerRow,
  TenuStats,
  UserRole,
} from "@/lib/types";
import { CreditCard, LayoutDashboard } from "lucide-react";

interface PlayerSummary {
  prix: number;
  totalPaye: number;
  reste: number;
  paye: boolean;
}

interface Props {
  activeTab: "paiements" | "dashboard";
  players: Player[];
  existingPayments: (TenuPayment & { players: Player })[];
  historyFilters: TenuPaymentHistoryFilters;
  playerSummaries: Record<string, PlayerSummary>;
  dashboardRows: TenuPlayerRow[];
  dashboardStats: TenuStats;
  dashboardFilters: TenuDashboardFilters;
  filterOptions: {
    players: { id: string; nom: string; prenom: string }[];
    trainers: { id: string; nom: string; prenom: string }[];
    categories: number[];
  };
  todayPayments: {
    montant: number;
    date_paiement: string;
    numero_recu: string;
    players?: { nom: string; prenom: string } | null;
  }[];
  todayTotal: number;
  todayDate: string;
  role: UserRole;
  appName: string;
}

export function TenuClient({
  activeTab,
  players,
  existingPayments,
  historyFilters,
  playerSummaries,
  dashboardRows,
  dashboardStats,
  dashboardFilters,
  filterOptions,
  todayPayments,
  todayTotal,
  todayDate,
  role,
  appName,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchTab(tab: "paiements" | "dashboard") {
    const params = new URLSearchParams();
    params.set("onglet", tab);
    startTransition(() => router.push(`/tenu?${params.toString()}`));
  }

  return (
    <>
      <PageHeader
        title="Tenu sportive"
        description="Gestion des paiements de tenue — 60 DT par joueur, paiements partiels acceptés"
      />

      <div className="mb-6 flex gap-2 border-b border-border">
        <Button
          variant={activeTab === "paiements" ? "primary" : "ghost"}
          size="sm"
          className="rounded-b-none"
          disabled={pending}
          onClick={() => switchTab("paiements")}
        >
          <CreditCard className="h-4 w-4" /> Paiements & reçus
        </Button>
        <Button
          variant={activeTab === "dashboard" ? "primary" : "ghost"}
          size="sm"
          className="rounded-b-none"
          disabled={pending}
          onClick={() => switchTab("dashboard")}
        >
          <LayoutDashboard className="h-4 w-4" /> Tableau de bord
        </Button>
      </div>

      {activeTab === "paiements" ? (
        <TenuPaymentTab
          players={players}
          trainers={filterOptions.trainers}
          existingPayments={existingPayments}
          historyFilters={historyFilters}
          playerSummaries={playerSummaries}
          role={role}
          appName={appName}
        />
      ) : (
        <TenuDashboardTab
          rows={dashboardRows}
          stats={dashboardStats}
          defaultFilters={dashboardFilters}
          filterOptions={filterOptions}
          todayPayments={todayPayments}
          todayTotal={todayTotal}
          todayDate={todayDate}
          appName={appName}
          role={role}
        />
      )}
    </>
  );
}
