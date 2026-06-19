"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPayment, deletePayment, updatePlayerRate } from "@/app/actions/payments";
import { generateReceiptPDF, exportPaymentHistoryPDF } from "@/lib/pdf";
import { formatMontant, moisLabel, moisOptions, anneeOptions } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PlayerAutocomplete } from "@/components/ui/PlayerAutocomplete";
import type { Player, Payment, PaymentHistoryFilters, UserRole } from "@/lib/types";
import { hasPermission } from "@/lib/permissions";
import { CreditCard, Trash2, Loader2, FileDown, Search } from "lucide-react";

interface Props {
  players: Player[];
  existingPayments: (Payment & { players: Player })[];
  historyFilters: PaymentHistoryFilters;
  role: UserRole;
}

export function PaymentClient({ players, existingPayments, historyFilters, role }: Props) {
  const router = useRouter();
  const [playerId, setPlayerId] = useState("");
  const [mois, setMois] = useState(new Date().getMonth() + 1);
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, startTransition] = useTransition();
  const [tarifEdit, setTarifEdit] = useState<{ id: string; value: string } | null>(null);

  const [histFilters, setHistFilters] = useState<PaymentHistoryFilters>(historyFilters);
  const [histPlayerSearch, setHistPlayerSearch] = useState(() => {
    if (!historyFilters.joueurId) return "";
    const p = players.find((pl) => pl.id === historyFilters.joueurId);
    return p ? `${p.prenom} ${p.nom}` : "";
  });

  const canRecord = hasPermission(role, "recordPayment");
  const canDelete = hasPermission(role, "deletePayment");
  const canEditRate = hasPermission(role, "modifyPlayerRate");
  const canExport = hasPermission(role, "exportReports");

  const filteredPlayers = players.filter((p) => {
    const q = search.toLowerCase();
    return `${p.prenom} ${p.nom}`.toLowerCase().includes(q);
  });

  const selectedPlayer = players.find((p) => p.id === playerId);
  const alreadyPaid = existingPayments.some(
    (p) => p.player_id === playerId && p.mois === mois && p.annee === annee
  );

  const histPlayer = players.find((p) => p.id === historyFilters.joueurId);

  function applyHistoryFilters(newFilters: PaymentHistoryFilters) {
    setHistFilters(newFilters);
    const params = new URLSearchParams();
    if (newFilters.joueurId) params.set("joueur", newFilters.joueurId);
    if (newFilters.mois) params.set("mois", String(newFilters.mois));
    if (newFilters.annee) params.set("annee", String(newFilters.annee));
    if (newFilters.datePaiement) params.set("datePaiement", newFilters.datePaiement);
    if (newFilters.numeroRecu) params.set("numeroRecu", newFilters.numeroRecu);
    startTransition(() => router.push(`/paiement?${params.toString()}`));
  }

  function handlePayment() {
    if (!playerId || alreadyPaid) return;
    setError("");
    setSuccess("");
    startTransition(async () => {
      const result = await createPayment(playerId, mois, annee);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess("Paiement enregistré avec succès");
      if (result.receipt) generateReceiptPDF(result.receipt);
      router.refresh();
    });
  }

  function handleDelete(paymentId: string) {
    if (!confirm("Confirmer la suppression de ce paiement ?")) return;
    startTransition(async () => {
      const result = await deletePayment(paymentId);
      if (result.error) setError(result.error);
      else {
        setSuccess("Paiement supprimé");
        router.refresh();
      }
    });
  }

  function handleRateUpdate(id: string) {
    if (!tarifEdit) return;
    startTransition(async () => {
      const result = await updatePlayerRate(id, Number(tarifEdit.value));
      if (result.error) setError(result.error);
      else {
        setSuccess("Tarif mis à jour");
        setTarifEdit(null);
      }
    });
  }

  return (
    <>
      <PageHeader title="Paiement" description="Enregistrer un paiement et consulter l'historique" />

      {canRecord && (
        <Card className="mb-6">
          <h2 className="mb-4 text-lg font-semibold">Nouveau paiement</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Rechercher un joueur</label>
              <input
                type="text"
                placeholder="Nom ou prénom…"
                className="mb-2 w-full rounded-lg border border-border px-3 py-2 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
              >
                <option value="">Sélectionner un joueur</option>
                {filteredPlayers.map((p) => (
                  <option key={p.id} value={p.id}>{p.prenom} {p.nom} ({p.annee_naissance})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Mois</label>
                <select className="w-full rounded-lg border border-border px-3 py-2 text-sm" value={mois} onChange={(e) => setMois(Number(e.target.value))}>
                  {moisOptions().map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Année</label>
                <select className="w-full rounded-lg border border-border px-3 py-2 text-sm" value={annee} onChange={(e) => setAnnee(Number(e.target.value))}>
                  {anneeOptions().map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
          </div>
          {selectedPlayer && (
            <div className="mt-4 rounded-lg bg-background p-3 text-sm">
              <p>Tarif : <strong>{formatMontant(Number(selectedPlayer.tarif_mensuel))}</strong></p>
              <p>Période : <strong>{moisLabel(mois)} {annee}</strong></p>
            </div>
          )}
          {alreadyPaid && (
            <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">
              Ce mois est déjà payé pour ce joueur.
            </div>
          )}
          {error && <div className="mt-4 text-sm text-danger">{error}</div>}
          {success && <div className="mt-4 text-sm text-success">{success}</div>}
          <Button variant="primary" className="mt-4" disabled={!playerId || alreadyPaid || pending} onClick={handlePayment}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            Valider et générer le reçu
          </Button>
        </Card>
      )}

      {canEditRate && (
        <Card className="mb-6">
          <h2 className="mb-4 text-lg font-semibold">Modifier le tarif d&apos;un joueur</h2>
          <div className="flex flex-wrap gap-3">
            <select className="rounded-lg border border-border px-3 py-2 text-sm" value={tarifEdit?.id ?? ""} onChange={(e) => {
              const p = players.find((pl) => pl.id === e.target.value);
              setTarifEdit(p ? { id: p.id, value: String(p.tarif_mensuel) } : null);
            }}>
              <option value="">Sélectionner un joueur</option>
              {players.map((p) => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
            </select>
            {tarifEdit && (
              <>
                <input type="number" className="w-32 rounded-lg border border-border px-3 py-2 text-sm" value={tarifEdit.value} onChange={(e) => setTarifEdit({ ...tarifEdit, value: e.target.value })} />
                <Button variant="primary" size="sm" onClick={() => handleRateUpdate(tarifEdit.id)}>Enregistrer</Button>
              </>
            )}
          </div>
        </Card>
      )}

      <Card>
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Historique des paiements</h2>
          {canExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportPaymentHistoryPDF(
                existingPayments,
                historyFilters,
                histPlayer ? `${histPlayer.prenom} ${histPlayer.nom}` : undefined
              )}
            >
              <FileDown className="h-4 w-4" /> PDF
            </Button>
          )}
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <PlayerAutocomplete
            players={players}
            value={histFilters.joueurId ?? ""}
            onChange={(id) => applyHistoryFilters({ ...histFilters, joueurId: id || undefined })}
            search={histPlayerSearch}
            onSearchChange={setHistPlayerSearch}
            label="Joueur"
          />
          <div>
            <label className="mb-1 block text-sm font-medium">Mois</label>
            <select className="w-full rounded-lg border border-border px-3 py-2 text-sm" value={histFilters.mois ?? ""} onChange={(e) => applyHistoryFilters({ ...histFilters, mois: e.target.value ? Number(e.target.value) : undefined })}>
              <option value="">Tous</option>
              {moisOptions().map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Année</label>
            <select className="w-full rounded-lg border border-border px-3 py-2 text-sm" value={histFilters.annee ?? ""} onChange={(e) => applyHistoryFilters({ ...histFilters, annee: e.target.value ? Number(e.target.value) : undefined })}>
              <option value="">Toutes</option>
              {anneeOptions().map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Date de paiement</label>
            <input type="date" className="w-full rounded-lg border border-border px-3 py-2 text-sm" value={histFilters.datePaiement ?? ""} onChange={(e) => applyHistoryFilters({ ...histFilters, datePaiement: e.target.value || undefined })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">N° reçu</label>
            <input
              type="text"
              placeholder="REC-…"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              value={histFilters.numeroRecu ?? ""}
              onChange={(e) => setHistFilters({ ...histFilters, numeroRecu: e.target.value || undefined })}
              onKeyDown={(e) => e.key === "Enter" && applyHistoryFilters(histFilters)}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button variant="primary" size="sm" onClick={() => applyHistoryFilters(histFilters)}>
              <Search className="h-4 w-4" /> Filtrer
            </Button>
            <Button variant="ghost" size="sm" onClick={() => {
              setHistPlayerSearch("");
              applyHistoryFilters({});
            }}>
              Réinitialiser
            </Button>
          </div>
        </div>

        <p className="mb-3 text-sm text-muted">{existingPayments.length} paiement(s) trouvé(s)</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted">Joueur</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Période</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Montant</th>
                <th className="px-3 py-2 text-left font-medium text-muted">N° reçu</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Date</th>
                {canDelete && <th className="px-3 py-2 text-right font-medium text-muted">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {existingPayments.length === 0 ? (
                <tr><td colSpan={canDelete ? 6 : 5} className="px-3 py-8 text-center text-muted">Aucun paiement trouvé</td></tr>
              ) : (
                existingPayments.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{p.players.prenom} {p.players.nom}</td>
                    <td className="px-3 py-2">{moisLabel(p.mois)} {p.annee}</td>
                    <td className="px-3 py-2">{formatMontant(Number(p.montant))}</td>
                    <td className="px-3 py-2 font-mono text-xs">{p.numero_recu}</td>
                    <td className="px-3 py-2 text-muted">{new Date(p.date_paiement).toLocaleString("fr-FR")}</td>
                    {canDelete && (
                      <td className="px-3 py-2 text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
                      </td>
                    )}
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
