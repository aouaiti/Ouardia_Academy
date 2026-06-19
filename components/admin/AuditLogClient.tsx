"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { purgeAuditLogs } from "@/app/actions/audit";
import { exportAuditPDF } from "@/lib/pdf";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/format";
import type { AuditLogEntry, AuditLogFilters } from "@/lib/types";
import { Trash2, Loader2, FileDown, Search } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  creation_paiement: "Création paiement",
  suppression_paiement: "Suppression paiement",
  ajout_joueur: "Ajout joueur",
  modif_joueur: "Modification joueur",
  modif_tarif_joueur: "Modification tarif",
  ajout_entraineur: "Ajout entraîneur",
  modif_entraineur: "Modification entraîneur",
  reaffectation_entraineur: "Réaffectation entraîneur",
  ajout_utilisateur: "Ajout utilisateur",
  modif_utilisateur: "Modification utilisateur",
  purge_audit_log: "Purge journal",
  modif_parametres: "Modification paramètres",
  reset_mot_de_passe: "Reset mot de passe",
  modif_mot_de_passe: "Modification mot de passe",
  envoi_reset_mot_de_passe: "Envoi lien reset mot de passe",
  modif_email_utilisateur: "Modification email",
  confirmation_email_utilisateur: "Confirmation email",
};

interface FilterOptions {
  users: { id: string; nom: string; prenom: string }[];
  actions: string[];
  tables: string[];
}

interface Props {
  entries: AuditLogEntry[];
  filters: AuditLogFilters;
  filterOptions: FilterOptions;
}

export function AuditLogClient({ entries, filters, filterOptions }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [localFilters, setLocalFilters] = useState<AuditLogFilters>(filters);

  function applyFilters(f: AuditLogFilters) {
    setLocalFilters(f);
    const params = new URLSearchParams();
    if (f.dateFrom) params.set("dateFrom", f.dateFrom);
    if (f.dateTo) params.set("dateTo", f.dateTo);
    if (f.action) params.set("action", f.action);
    if (f.userId) params.set("userId", f.userId);
    if (f.tableCible) params.set("tableCible", f.tableCible);
    if (f.search) params.set("search", f.search);
    startTransition(() => router.push(`/admin/journal?${params.toString()}`));
  }

  function handlePurge(months: 3 | 6 | 9 | 12) {
    if (!confirm(`Supprimer les entrées de plus de ${months} mois ? Cette action est irréversible.`)) return;
    startTransition(async () => {
      const result = await purgeAuditLogs(months);
      if (result.error) setMessage(result.error);
      else setMessage(`${result.deleted} entrée(s) supprimée(s)`);
    });
  }

  return (
    <>
      <PageHeader
        title="Journal d'audit"
        description="Historique de toutes les actions sensibles"
        actions={
          <Button variant="outline" size="sm" onClick={() => exportAuditPDF(entries, filters)}>
            <FileDown className="h-4 w-4" /> PDF
          </Button>
        }
      />

      <Card className="mb-6">
        <h2 className="mb-3 font-semibold">Filtres</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Du</label>
            <input type="date" className="w-full rounded-lg border border-border px-3 py-2 text-sm" value={localFilters.dateFrom ?? ""} onChange={(e) => setLocalFilters({ ...localFilters, dateFrom: e.target.value || undefined })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Au</label>
            <input type="date" className="w-full rounded-lg border border-border px-3 py-2 text-sm" value={localFilters.dateTo ?? ""} onChange={(e) => setLocalFilters({ ...localFilters, dateTo: e.target.value || undefined })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Action</label>
            <select className="w-full rounded-lg border border-border px-3 py-2 text-sm" value={localFilters.action ?? ""} onChange={(e) => setLocalFilters({ ...localFilters, action: e.target.value || undefined })}>
              <option value="">Toutes</option>
              {filterOptions.actions.map((a) => (
                <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Utilisateur</label>
            <select className="w-full rounded-lg border border-border px-3 py-2 text-sm" value={localFilters.userId ?? ""} onChange={(e) => setLocalFilters({ ...localFilters, userId: e.target.value || undefined })}>
              <option value="">Tous</option>
              {filterOptions.users.map((u) => (
                <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Table cible</label>
            <select className="w-full rounded-lg border border-border px-3 py-2 text-sm" value={localFilters.tableCible ?? ""} onChange={(e) => setLocalFilters({ ...localFilters, tableCible: e.target.value || undefined })}>
              <option value="">Toutes</option>
              {filterOptions.tables.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Recherche</label>
            <input type="text" placeholder="Texte dans les détails…" className="w-full rounded-lg border border-border px-3 py-2 text-sm" value={localFilters.search ?? ""} onChange={(e) => setLocalFilters({ ...localFilters, search: e.target.value || undefined })} />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="primary" size="sm" onClick={() => applyFilters(localFilters)}>
            <Search className="h-4 w-4" /> Filtrer
          </Button>
          <Button variant="ghost" size="sm" onClick={() => applyFilters({})}>Réinitialiser</Button>
        </div>
        <p className="mt-2 text-sm text-muted">{entries.length} entrée(s)</p>
      </Card>

      <Card className="mb-6">
        <h2 className="mb-3 font-semibold">Purge du journal</h2>
        <div className="flex flex-wrap gap-2">
          {([3, 6, 9, 12] as const).map((m) => (
            <Button key={m} variant="danger" size="sm" disabled={pending} onClick={() => handlePurge(m)}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Garder {m} mois
            </Button>
          ))}
        </div>
        {message && <p className="mt-3 text-sm text-muted">{message}</p>}
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted">Date</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Utilisateur</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Action</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Cible</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Détails</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-muted">Aucune entrée</td></tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(e.created_at)}</td>
                    <td className="px-3 py-2">{e.app_users ? `${e.app_users.prenom} ${e.app_users.nom}` : "—"}</td>
                    <td className="px-3 py-2">{ACTION_LABELS[e.action] ?? e.action}</td>
                    <td className="px-3 py-2 font-mono text-xs">{e.table_cible ?? "—"}</td>
                    <td className="px-3 py-2 max-w-xs truncate text-muted">{e.details ? JSON.stringify(e.details) : "—"}</td>
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
