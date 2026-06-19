"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { DashboardFilters, PlayerRow } from "@/lib/types";
import { formatDateTime, formatMontant, moisLabel, moisOptions, anneeOptions, formatDate } from "@/lib/format";
import { exportDashboardPDF, exportDashboardCSV, exportDebtPDF, exportYearlyPDF, exportDailyReportPDF } from "@/lib/pdf";
import { saveFilterShortcut } from "@/app/actions/shortcuts";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatCard, Card } from "@/components/ui/Card";
import { FileDown, FileSpreadsheet, Save, Search } from "lucide-react";

interface Props {
  initialRows: PlayerRow[];
  initialStats: {
    totalEncaisse: number;
    totalAttendu: number;
    nbPayes: number;
    nbNonPayes: number;
    periodTotalDu: number;
    periodTotalPaye: number;
    periodTotalDette: number;
  };
  yearStats: {
    totalEncaisse: number;
    totalAttendu: number;
    totalDette: number;
    monthly: { mois: number; montant: number; attendu: number }[];
  };
  calcStart: { mois: number; annee: number };
  filterOptions: {
    players: { id: string; nom: string; prenom: string }[];
    trainers: { id: string; nom: string; prenom: string }[];
    categories: number[];
  };
  shortcuts: { id: string; nom: string; filtres: DashboardFilters }[];
  defaultFilters: DashboardFilters;
  todayPayments: {
    montant: number;
    date_paiement: string;
    numero_recu: string;
    mois: number;
    annee: number;
    players?: { nom: string; prenom: string } | null;
  }[];
  todayTotal: number;
  todayDate: string;
  appName: string;
}

const QUICK_FILTERS: { label: string; filtres: Partial<DashboardFilters> }[] = [
  { label: "Impayés du mois", filtres: { statut: "non_paye" } },
  { label: "Payés aujourd'hui", filtres: { statut: "paye", datePaiement: new Date().toISOString().slice(0, 10) } },
];

export function DashboardClient({
  initialRows,
  initialStats,
  yearStats,
  calcStart,
  filterOptions,
  shortcuts,
  defaultFilters,
  todayPayments,
  todayTotal,
  todayDate,
  appName,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);
  const [shortcutName, setShortcutName] = useState("");

  const rows = initialRows;
  const stats = initialStats;

  function applyFilters(newFilters: DashboardFilters) {
    setFilters(newFilters);
    const params = new URLSearchParams();
    params.set("mois", String(newFilters.mois));
    params.set("annee", String(newFilters.annee));
    params.set("calcMois", String(newFilters.calcMois ?? 1));
    params.set("calcAnnee", String(newFilters.calcAnnee ?? newFilters.annee));
    if (newFilters.statut) params.set("statut", newFilters.statut);
    if (newFilters.anneeNaissance) params.set("categorie", String(newFilters.anneeNaissance));
    if (newFilters.joueurId) params.set("joueur", newFilters.joueurId);
    if (newFilters.entraineurId) params.set("entraineur", newFilters.entraineurId);
    if (newFilters.datePaiement) params.set("datePaiement", newFilters.datePaiement);
    startTransition(() => router.push(`/dashboard?${params.toString()}`));
  }

  const maxMonthly = useMemo(
    () => Math.max(...yearStats.monthly.map((m) => Math.max(m.montant, m.attendu)), 1),
    [yearStats.monthly]
  );

  const debtRows = useMemo(
    () => [...rows].filter((r) => r.financials.dette > 0).sort((a, b) => b.financials.dette - a.financials.dette),
    [rows]
  );

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description={`Suivi des paiements — ${moisLabel(filters.mois)} ${filters.annee}`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => exportDashboardPDF(rows, filters, stats, calcStart)}>
              <FileDown className="h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportDebtPDF(rows, filters, stats, calcStart)}>
              <FileDown className="h-4 w-4" /> PDF Dettes
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportYearlyPDF(filters.annee, calcStart, yearStats, rows)}>
              <FileDown className="h-4 w-4" /> PDF Annuel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportDailyReportPDF(todayPayments, todayTotal, formatDate(todayDate), appName)}
            >
              <FileDown className="h-4 w-4" /> Rapport du jour
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportDashboardCSV(rows, filters)}>
              <FileSpreadsheet className="h-4 w-4" /> CSV
            </Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Encaissé ce mois"
          value={formatMontant(stats.totalEncaisse)}
          sub={`Attendu : ${formatMontant(stats.totalAttendu)}`}
          accent="green"
        />
        <StatCard
          label="Payés / Non payés"
          value={`${stats.nbPayes} / ${stats.nbNonPayes}`}
          accent="blue"
        />
        <StatCard
          label={`Total payé (depuis ${moisLabel(calcStart.mois)} ${calcStart.annee})`}
          value={formatMontant(stats.periodTotalPaye)}
          sub={`Dû : ${formatMontant(stats.periodTotalDu)}`}
          accent="green"
        />
        <StatCard
          label="Dette totale"
          value={formatMontant(stats.periodTotalDette)}
          accent="red"
        />
      </div>

      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold">Encaissements du jour</h3>
            <p className="text-xs text-muted">{formatDate(todayDate)} — {todayPayments.length} paiement{todayPayments.length !== 1 ? "s" : ""}</p>
          </div>
          <p className="text-lg font-bold text-success">{formatMontant(todayTotal)}</p>
        </div>
        {todayPayments.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">Aucun paiement enregistré aujourd&apos;hui.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-muted">Joueur</th>
                <th className="px-4 py-2 text-left font-medium text-muted">Période</th>
                <th className="px-4 py-2 text-right font-medium text-muted">Montant</th>
                <th className="px-4 py-2 text-left font-medium text-muted">Date et heure</th>
              </tr>
            </thead>
            <tbody>
              {todayPayments.map((p) => (
                <tr key={p.numero_recu} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">
                    {p.players ? `${p.players.prenom} ${p.players.nom}` : "—"}
                  </td>
                  <td className="px-4 py-2">{moisLabel(p.mois)} {p.annee}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatMontant(Number(p.montant))}</td>
                  <td className="px-4 py-2">{formatDateTime(p.date_paiement)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="mb-6 rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-3 text-sm font-semibold">Évolution mensuelle {filters.annee}</h3>
        <div className="flex h-28 items-end gap-1">
          {yearStats.monthly.map((m) => (
            <div key={m.mois} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full items-end justify-center gap-0.5" style={{ height: "80px" }}>
                <div
                  className="w-1/2 rounded-t bg-primary/80"
                  style={{ height: `${(m.montant / maxMonthly) * 80}px`, minHeight: m.montant > 0 ? "3px" : "0" }}
                  title={`Encaissé: ${formatMontant(m.montant)}`}
                />
                <div
                  className="w-1/2 rounded-t bg-primary/30"
                  style={{ height: `${(m.attendu / maxMonthly) * 80}px`, minHeight: m.attendu > 0 ? "3px" : "0" }}
                  title={`Attendu: ${formatMontant(m.attendu)}`}
                />
              </div>
              <span className="text-[10px] text-muted">{m.mois}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Barres foncées = encaissé, claires = attendu (selon date d&apos;inscription)</p>
      </div>

      <Card className="mb-6">
        <h3 className="mb-3 font-semibold">Dettes par joueur</h3>
        {debtRows.length === 0 ? (
          <p className="text-sm text-muted">Aucune dette sur la période sélectionnée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted">Joueur</th>
                  <th className="px-3 py-2 text-left font-medium text-muted">Inscription</th>
                  <th className="px-3 py-2 text-right font-medium text-muted">Mois dus</th>
                  <th className="px-3 py-2 text-right font-medium text-muted">Total payé</th>
                  <th className="px-3 py-2 text-right font-medium text-muted">Total dû</th>
                  <th className="px-3 py-2 text-right font-medium text-muted">Dette</th>
                </tr>
              </thead>
              <tbody>
                {debtRows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 bg-red-50/50">
                    <td className="px-3 py-2 font-medium">{r.prenom} {r.nom}</td>
                    <td className="px-3 py-2">{moisLabel(r.mois_inscription)} {r.annee_inscription}</td>
                    <td className="px-3 py-2 text-right">{r.financials.moisDus}</td>
                    <td className="px-3 py-2 text-right">{formatMontant(r.financials.totalPaye)}</td>
                    <td className="px-3 py-2 text-right">{formatMontant(r.financials.totalDu)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-danger">{formatMontant(r.financials.dette)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mb-4 rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-3 text-sm font-semibold">Filtres</h3>
        <div className="mb-3 flex flex-wrap gap-2">
          {QUICK_FILTERS.map((qf) => (
            <Button key={qf.label} variant="ghost" size="sm" onClick={() => applyFilters({ ...filters, ...qf.filtres })}>
              {qf.label}
            </Button>
          ))}
          {shortcuts.map((s) => (
            <Button key={s.id} variant="ghost" size="sm" onClick={() => applyFilters(s.filtres)}>
              {s.nom}
            </Button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={filters.statut ?? ""} onChange={(e) => applyFilters({ ...filters, statut: (e.target.value || undefined) as DashboardFilters["statut"] })}>
            <option value="">Tous les statuts</option>
            <option value="paye">Payé</option>
            <option value="non_paye">Non payé</option>
          </select>
          <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={filters.anneeNaissance ?? ""} onChange={(e) => applyFilters({ ...filters, anneeNaissance: e.target.value ? Number(e.target.value) : undefined })}>
            <option value="">Toutes catégories</option>
            {filterOptions.categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={filters.mois} onChange={(e) => applyFilters({ ...filters, mois: Number(e.target.value) })}>
            {moisOptions().map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={filters.annee} onChange={(e) => applyFilters({ ...filters, annee: Number(e.target.value) })}>
            {anneeOptions().map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={filters.joueurId ?? ""} onChange={(e) => applyFilters({ ...filters, joueurId: e.target.value || undefined })}>
            <option value="">Tous les joueurs</option>
            {filterOptions.players.map((p) => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
          </select>
          <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={filters.entraineurId ?? ""} onChange={(e) => applyFilters({ ...filters, entraineurId: e.target.value || undefined })}>
            <option value="">Tous les entraîneurs</option>
            {filterOptions.trainers.map((t) => <option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>)}
          </select>
          <input type="date" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={filters.datePaiement ?? ""} onChange={(e) => applyFilters({ ...filters, datePaiement: e.target.value || undefined })} />
          <div className="flex gap-2">
            <input type="text" placeholder="Nom du raccourci" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" value={shortcutName} onChange={(e) => setShortcutName(e.target.value)} />
            <Button variant="outline" size="sm" disabled={!shortcutName} onClick={async () => { await saveFilterShortcut(shortcutName, filters); setShortcutName(""); router.refresh(); }}>
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="mb-2 text-xs font-semibold text-primary">Calcul des dues depuis :</p>
          <div className="flex flex-wrap gap-3">
            <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={filters.calcMois ?? 1} onChange={(e) => applyFilters({ ...filters, calcMois: Number(e.target.value) })}>
              {moisOptions().map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={filters.calcAnnee ?? filters.annee} onChange={(e) => applyFilters({ ...filters, calcAnnee: Number(e.target.value) })}>
              {anneeOptions(10).map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <p className="mt-2 text-xs text-muted">
            Les totaux dus tiennent compte de la date d&apos;inscription de chaque joueur. Un joueur inscrit en juin ne sera pas facturé pour janvier–mai.
          </p>
        </div>
      </div>

      {pending && <div className="mb-4 text-sm text-muted">Chargement…</div>}

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted">Joueur</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Catégorie</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Entraîneur</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Statut mois</th>
              <th className="px-4 py-3 text-left font-medium text-muted">Date paiement</th>
              <th className="px-4 py-3 text-right font-medium text-muted">Payé / Dû / Dette</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  <Search className="mx-auto mb-2 h-5 w-5 opacity-50" />
                  Aucun joueur trouvé
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-border last:border-0 ${
                    row.paye ? "bg-green-50 hover:bg-green-100/60" : "bg-red-50 hover:bg-red-100/60"
                  }`}
                >
                  <td className="px-4 py-3 font-medium">{row.prenom} {row.nom}</td>
                  <td className="px-4 py-3">{row.annee_naissance}</td>
                  <td className="px-4 py-3">{row.trainers ? `${row.trainers.prenom} ${row.trainers.nom}` : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${row.paye ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}>
                      {row.paye ? "Payé" : "Non payé"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{row.payment ? formatDateTime(row.payment.date_paiement) : "—"}</td>
                  <td className="px-4 py-3 text-right text-xs">
                    <span className="text-success">{formatMontant(row.financials.totalPaye)}</span>
                    {" / "}
                    <span>{formatMontant(row.financials.totalDu)}</span>
                    {" / "}
                    <span className={row.financials.dette > 0 ? "font-semibold text-danger" : ""}>
                      {formatMontant(row.financials.dette)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
