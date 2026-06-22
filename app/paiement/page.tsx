import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { PaymentClient } from "@/components/paiement/PaymentClient";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { fetchPaymentHistory } from "@/lib/data/payments";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { PaymentHistoryFilters } from "@/lib/types";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function PaiementPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const canView = hasPermission(session.profile.role, "recordPayment") ||
    hasPermission(session.profile.role, "deletePayment") ||
    hasPermission(session.profile.role, "modifyPlayerRate");

  if (!canView) redirect("/dashboard");

  const historyFilters: PaymentHistoryFilters = {
    joueurId: params.joueur,
    categorie: params.categorie ? Number(params.categorie) : undefined,
    entraineurId: params.entraineur,
    mois: params.mois ? Number(params.mois) : undefined,
    annee: params.annee ? Number(params.annee) : undefined,
    datePaiement: params.datePaiement,
    numeroRecu: params.numeroRecu,
  };

  const supabase = await createClient();
  const [{ data: players }, { data: trainers }, { payments }] = await Promise.all([
    supabase.from("players").select("*").eq("statut", "actif").order("nom"),
    supabase.from("trainers").select("id, nom, prenom").eq("actif", true).order("nom"),
    fetchPaymentHistory(historyFilters),
  ]);

  return (
    <AuthenticatedLayout>
      <PaymentClient
        players={players ?? []}
        trainers={trainers ?? []}
        existingPayments={(payments ?? []) as never}
        historyFilters={historyFilters}
        role={session.profile.role}
      />
    </AuthenticatedLayout>
  );
}
