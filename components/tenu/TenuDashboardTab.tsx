"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TenuDashboardFilters, TenuPlayerRow, TenuStats } from "@/lib/types";
import { formatDate, formatMontant } from "@/lib/format";
import { exportTenuDashboardPDF, exportTenuDailyReportPDF } from "@/lib/pdf";
import { StatCard, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { hasPermission } from "@/lib/permissions";
import type { UserRole } from "@/lib/types";
import { FileDown } from "lucide-react";

interface Props {
  rows: TenuPlayerRow[];
  stats: TenuStats;
  defaultFilters: TenuDashboardFilters;
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
  appName: string;
  role: UserRole;
}

export function TenuDashboardTab({
  rows,
  stats,
  defaultFilters,
  filterOptions,
  todayPayments,
  todayTotal,
  todayDate,
  appName,
  role,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState<TenuDashboardFilters>(defaultFilters);
  const canExport = hasPermission(role, "exportReports");

  function applyFilters(newFilters: TenuDashboardFilters) {
    setFilters(newFilters);
    const params = new URLSearchParams();
    params.set("onglet", "dashboard");
    if (newFilters.statut) params.set("statut", newFilters.statut);
    if (newFilters.anneeNaissance) params.set("categorie", String(newFilters.anneeNaissance));
    if (newFilters.joueurId) params.set("joueur", newFilters.joueurId);
    if (newFilters.entraineurId) params.set("entraineur", newFilters.entraineurId);
    if (newFilters.datePaiement) params.set("datePaiement", newFilters.datePaiement);
    startTransition(() => router.push(`/tenu?${params.toString()}`));
  }

  const unpaidRows = rows.filter((r) => r.reste > 0).sort((a, b) => b.reste - a.reste);

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-3">
        <Button variant="outline" size="sm" onClick={() => exportTenuDashboardPDF(rows, stats)}>
          <FileDown className="h-4 w-4" /> PDF
        </Button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total encaissé" value={formatMontant(stats.totalEncaisse)} accent="green" />
        <StatCard label="Total attendu" value={formatMontant(stats.totalAttendu)} accent="blue" />
        <StatCard label="Reste à encaisser" value={formatMontant(stats.totalReste)} accent="red" />
        <StatCard
          label="Joueurs"
          value={`${stats.nbPayes} payés`}
          sub={`${stats.nbPartiels} partiels · ${stats.nbNonPayes} non payés`}
          accent="blue"
        />
      </div>

      <Card className="mb-6">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold">Encaissements tenu du jour — {formatDate(todayDate)}</h3>
          {canExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportTenuDailyReportPDF(todayPayments, todayTotal, formatDate(todayDate), appName)}
            >
              <FileDown className="h-4 w-4" /> PDF
            </Button>
          )}
        </div>
        <p className="mb-3 text-sm text-muted">
          {todayPayments.length} paiement(s) · Total : <strong>{formatMontant(todayTotal)}</strong>
        </p>
        {todayPayments.length === 0 ? (
          <p className="text-sm text-muted">Aucun paiement tenu aujourd&apos;hui.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted">Joueur</th>
                  <th className="px-3 py-2 text-left font-medium text-muted">Montant</th>
                  <th className="px-3 py-2 text-left font-medium text-muted">N° reçu</th>
                </tr>
              </thead>
              <tbody>
                {todayPayments.map((p) => (
                  <tr key={p.numero_recu} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{p.players ? `${p.players.prenom} ${p.players.nom}` : "—"}</td>
                    <td className="px-3 py-2">{formatMontant(Number(p.montant))}</td>
                    <td className="px-3 py-2 font-mono text-xs">{p.numero_recu}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mb-6">
        <h3 className="mb-3 text-sm font-semibold">Filtres</h3>
        <div className="flex flex-wrap gap-3">
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={filters.statut ?? ""}
            onChange={(e) => applyFilters({ ...filters, statut: (e.target.value || undefined) as TenuDashboardFilters["statut"] })}
          >
            <option value="">Tous les statuts</option>
            <option value="paye">Payé</option>
            <option value="partiel">Partiel</option>
            <option value="non_paye">Non payé</option>
          </select>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={filters.anneeNaissance ?? ""}
            onChange={(e) => applyFilters({ ...filters, anneeNaissance: e.target.value ? Number(e.target.value) : undefined })}
          >
            <option value="">Toutes catégories</option>
            {filterOptions.categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={filters.joueurId ?? ""}
            onChange={(e) => applyFilters({ ...filters, joueurId: e.target.value || undefined })}
          >
            <option value="">Tous les joueurs</option>
            {filterOptions.players.map((p) => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
          </select>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={filters.entraineurId ?? ""}
            onChange={(e) => applyFilters({ ...filters, entraineurId: e.target.value || undefined })}
          >
            <option value="">Tous les entraîneurs</option>
            {filterOptions.trainers.map((t) => <option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>)}
          </select>
          <input
            type="date"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={filters.datePaiement ?? ""}
            onChange={(e) => applyFilters({ ...filters, datePaiement: e.target.value || undefined })}
            title="Joueurs ayant payé à cette date"
          />
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => applyFilters({})}>
            Réinitialiser
          </Button>
        </div>
      </Card>

      <Card className="mb-6">
        <h3 className="mb-3 text-sm font-semibold">Soldes restants</h3>
        {unpaidRows.length === 0 ? (
          <p className="text-sm text-muted">Toutes les tenus sont payées pour les joueurs filtrés.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted">Joueur</th>
                  <th className="px-3 py-2 text-left font-medium text-muted">Payé</th>
                  <th className="px-3 py-2 text-left font-medium text-muted">Reste</th>
                </tr>
              </thead>
              <tbody>
                {unpaidRows.slice(0, 15).map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{r.prenom} {r.nom}</td>
                    <td className="px-3 py-2">{formatMontant(r.totalPaye)}</td>
                    <td className="px-3 py-2 font-medium text-danger">{formatMontant(r.reste)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-semibold">Liste des joueurs — statut tenu</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted">Joueur</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Catégorie</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Entraîneur</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Prix</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Payé</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Reste</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted">Aucun joueur</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{r.prenom} {r.nom}</td>
                    <td className="px-3 py-2">{r.annee_naissance}</td>
                    <td className="px-3 py-2">{r.trainers ? `${r.trainers.prenom} ${r.trainers.nom}` : "—"}</td>
                    <td className="px-3 py-2">{formatMontant(r.prix)}</td>
                    <td className="px-3 py-2">{formatMontant(r.totalPaye)}</td>
                    <td className="px-3 py-2">{formatMontant(r.reste)}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        r.paye ? "bg-green-100 text-success" : r.partiel ? "bg-amber-100 text-amber-700" : "bg-red-100 text-danger"
                      }`}>
                        {r.paye ? "Payé" : r.partiel ? "Partiel" : "Non payé"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
