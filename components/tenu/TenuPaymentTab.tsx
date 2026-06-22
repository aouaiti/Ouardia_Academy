"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createTenuPayment, deleteTenuPayment, updateTenuPrice } from "@/app/actions/tenu";
import { generateTenuReceiptPDF, exportTenuPaymentHistoryPDF } from "@/lib/pdf";
import { formatMontant } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PlayerAutocomplete } from "@/components/ui/PlayerAutocomplete";
import type { Player, TenuPayment, TenuPaymentHistoryFilters, UserRole } from "@/lib/types";
import { hasPermission } from "@/lib/permissions";
import { CreditCard, Trash2, Loader2, FileDown, Search } from "lucide-react";
import { DEFAULT_TENU_PRIX } from "@/lib/types";

interface PlayerSummary {
  prix: number;
  totalPaye: number;
  reste: number;
  paye: boolean;
}

interface Props {
  players: Player[];
  trainers: { id: string; nom: string; prenom: string }[];
  existingPayments: (TenuPayment & { players: Player })[];
  historyFilters: TenuPaymentHistoryFilters;
  playerSummaries: Record<string, PlayerSummary>;
  role: UserRole;
  appName: string;
}

export function TenuPaymentTab({
  players,
  trainers,
  existingPayments,
  historyFilters,
  playerSummaries,
  role,
  appName,
}: Props) {
  const router = useRouter();
  const [playerId, setPlayerId] = useState("");
  const [categorie, setCategorie] = useState<number | "">("");
  const [search, setSearch] = useState("");
  const [montant, setMontant] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, startTransition] = useTransition();
  const [priceEdit, setPriceEdit] = useState<{ id: string; value: string } | null>(null);

  const [histFilters, setHistFilters] = useState<TenuPaymentHistoryFilters>(historyFilters);
  const [histPlayerSearch, setHistPlayerSearch] = useState(() => {
    if (!historyFilters.joueurId) return "";
    const p = players.find((pl) => pl.id === historyFilters.joueurId);
    return p ? `${p.prenom} ${p.nom}` : "";
  });

  const canRecord = hasPermission(role, "recordPayment");
  const canDelete = hasPermission(role, "deletePayment");
  const canEditPrice = hasPermission(role, "modifyPlayerRate");
  const canExport = hasPermission(role, "exportReports");

  const categories = useMemo(
    () => [...new Set(players.map((p) => p.annee_naissance))].sort((a, b) => b - a),
    [players]
  );

  const filteredPlayers = useMemo(() => players.filter((p) => {
    if (categorie && p.annee_naissance !== categorie) return false;
    const q = search.toLowerCase().trim();
    if (q && !`${p.prenom} ${p.nom}`.toLowerCase().includes(q)) return false;
    return true;
  }), [players, categorie, search]);

  const histPlayers = useMemo(() => {
    let list = players;
    if (histFilters.categorie) list = list.filter((p) => p.annee_naissance === histFilters.categorie);
    if (histFilters.entraineurId) list = list.filter((p) => p.entraineur_id === histFilters.entraineurId);
    return list;
  }, [players, histFilters.categorie, histFilters.entraineurId]);

  const selectedPlayer = players.find((p) => p.id === playerId);
  const summary = playerId ? playerSummaries[playerId] : undefined;
  const fullyPaid = summary?.paye ?? false;

  const histPlayer = players.find((p) => p.id === historyFilters.joueurId);

  function applyHistoryFilters(newFilters: TenuPaymentHistoryFilters) {
    setHistFilters(newFilters);
    const params = new URLSearchParams(window.location.search);
    params.set("onglet", "paiements");
    if (newFilters.joueurId) params.set("joueur", newFilters.joueurId);
    else params.delete("joueur");
    if (newFilters.categorie) params.set("categorie", String(newFilters.categorie));
    else params.delete("categorie");
    if (newFilters.entraineurId) params.set("entraineur", newFilters.entraineurId);
    else params.delete("entraineur");
    if (newFilters.datePaiement) params.set("datePaiement", newFilters.datePaiement);
    else params.delete("datePaiement");
    if (newFilters.numeroRecu) params.set("numeroRecu", newFilters.numeroRecu);
    else params.delete("numeroRecu");
    startTransition(() => router.push(`/tenu?${params.toString()}`));
  }

  function handlePayment() {
    if (!playerId || fullyPaid || !montant) return;
    setError("");
    setSuccess("");
    startTransition(async () => {
      const result = await createTenuPayment(playerId, Number(montant));
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess("Paiement tenu enregistré avec succès");
      setMontant("");
      if (result.receipt) generateTenuReceiptPDF({ ...result.receipt, appName });
      router.refresh();
    });
  }

  function handleDelete(paymentId: string) {
    if (!confirm("Confirmer la suppression de ce paiement tenu ?")) return;
    startTransition(async () => {
      const result = await deleteTenuPayment(paymentId);
      if (result.error) setError(result.error);
      else {
        setSuccess("Paiement supprimé");
        router.refresh();
      }
    });
  }

  function handlePriceUpdate(id: string) {
    if (!priceEdit) return;
    startTransition(async () => {
      const result = await updateTenuPrice(id, Number(priceEdit.value));
      if (result.error) setError(result.error);
      else {
        setSuccess("Prix tenu mis à jour");
        setPriceEdit(null);
        router.refresh();
      }
    });
  }

  return (
    <>
      {canRecord && (
        <Card className="mb-6">
          <h2 className="mb-4 text-lg font-semibold">Nouveau paiement tenu</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Catégorie</label>
                <select
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  value={categorie}
                  onChange={(e) => {
                    const value = e.target.value ? Number(e.target.value) : "";
                    setCategorie(value);
                    if (value && playerId) {
                      const p = players.find((pl) => pl.id === playerId);
                      if (p && p.annee_naissance !== value) setPlayerId("");
                    }
                  }}
                >
                  <option value="">Toutes les catégories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Rechercher un joueur</label>
                <input
                  type="text"
                  placeholder="Nom ou prénom…"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Joueur</label>
                <select
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  value={playerId}
                  onChange={(e) => {
                    setPlayerId(e.target.value);
                    setMontant("");
                  }}
                >
                  <option value="">Sélectionner un joueur</option>
                  {filteredPlayers.map((p) => (
                    <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Montant (DT)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Ex. 20"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  disabled={!playerId || fullyPaid}
                />
              </div>
              {selectedPlayer && summary && (
                <div className="rounded-lg bg-background p-3 text-sm">
                  <p>Prix tenu : <strong>{formatMontant(summary.prix)}</strong></p>
                  <p>Déjà payé : <strong>{formatMontant(summary.totalPaye)}</strong></p>
                  <p>Reste : <strong>{formatMontant(summary.reste)}</strong></p>
                </div>
              )}
            </div>
          </div>
          {fullyPaid && (
            <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-success">
              La tenu est entièrement payée pour ce joueur.
            </div>
          )}
          {error && <div className="mt-4 text-sm text-danger">{error}</div>}
          {success && <div className="mt-4 text-sm text-success">{success}</div>}
          <Button
            variant="primary"
            className="mt-4"
            disabled={!playerId || fullyPaid || !montant || pending}
            onClick={handlePayment}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            Valider et générer le reçu
          </Button>
        </Card>
      )}

      {canEditPrice && (
        <Card className="mb-6">
          <h2 className="mb-4 text-lg font-semibold">Modifier le prix tenu d&apos;un joueur</h2>
          <p className="mb-3 text-xs text-muted">Prix par défaut : {formatMontant(DEFAULT_TENU_PRIX)}</p>
          <div className="flex flex-wrap gap-3">
            <select
              className="rounded-lg border border-border px-3 py-2 text-sm"
              value={priceEdit?.id ?? ""}
              onChange={(e) => {
                const p = players.find((pl) => pl.id === e.target.value);
                const s = p ? playerSummaries[p.id] : undefined;
                setPriceEdit(p ? { id: p.id, value: String(s?.prix ?? DEFAULT_TENU_PRIX) } : null);
              }}
            >
              <option value="">Sélectionner un joueur</option>
              {players.map((p) => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
            </select>
            {priceEdit && (
              <>
                <input
                  type="number"
                  className="w-32 rounded-lg border border-border px-3 py-2 text-sm"
                  value={priceEdit.value}
                  onChange={(e) => setPriceEdit({ ...priceEdit, value: e.target.value })}
                />
                <Button variant="primary" size="sm" onClick={() => handlePriceUpdate(priceEdit.id)}>Enregistrer</Button>
              </>
            )}
          </div>
        </Card>
      )}

      <Card>
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Historique des paiements tenu</h2>
          {canExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const trainer = histFilters.entraineurId
                  ? trainers.find((t) => t.id === histFilters.entraineurId)
                  : undefined;
                exportTenuPaymentHistoryPDF(
                  existingPayments,
                  historyFilters,
                  histPlayer ? `${histPlayer.prenom} ${histPlayer.nom}` : undefined,
                  trainer ? `${trainer.prenom} ${trainer.nom}` : undefined
                );
              }}
            >
              <FileDown className="h-4 w-4" /> PDF
            </Button>
          )}
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Catégorie</label>
            <select
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              value={histFilters.categorie ?? ""}
              onChange={(e) => {
                const cat = e.target.value ? Number(e.target.value) : undefined;
                const next: TenuPaymentHistoryFilters = { ...histFilters, categorie: cat };
                if (cat && next.joueurId) {
                  const p = players.find((pl) => pl.id === next.joueurId);
                  if (p && p.annee_naissance !== cat) {
                    next.joueurId = undefined;
                    setHistPlayerSearch("");
                  }
                }
                applyHistoryFilters(next);
              }}
            >
              <option value="">Toutes</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <PlayerAutocomplete
            players={histPlayers}
            value={histFilters.joueurId ?? ""}
            onChange={(id) => applyHistoryFilters({ ...histFilters, joueurId: id || undefined })}
            search={histPlayerSearch}
            onSearchChange={setHistPlayerSearch}
            label="Joueur"
          />
          <div>
            <label className="mb-1 block text-sm font-medium">Entraîneur</label>
            <select
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              value={histFilters.entraineurId ?? ""}
              onChange={(e) => {
                const entraineurId = e.target.value || undefined;
                const next: TenuPaymentHistoryFilters = { ...histFilters, entraineurId };
                if (entraineurId && next.joueurId) {
                  const p = players.find((pl) => pl.id === next.joueurId);
                  if (p && p.entraineur_id !== entraineurId) {
                    next.joueurId = undefined;
                    setHistPlayerSearch("");
                  }
                }
                applyHistoryFilters(next);
              }}
            >
              <option value="">Tous</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Date de paiement</label>
            <input
              type="date"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              value={histFilters.datePaiement ?? ""}
              onChange={(e) => applyHistoryFilters({ ...histFilters, datePaiement: e.target.value || undefined })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">N° reçu</label>
            <input
              type="text"
              placeholder="TEN-…"
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
                <th className="px-3 py-2 text-left font-medium text-muted">Montant</th>
                <th className="px-3 py-2 text-left font-medium text-muted">N° reçu</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Date</th>
                {canDelete && <th className="px-3 py-2 text-right font-medium text-muted">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {existingPayments.length === 0 ? (
                <tr><td colSpan={canDelete ? 5 : 4} className="px-3 py-8 text-center text-muted">Aucun paiement trouvé</td></tr>
              ) : (
                existingPayments.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{p.players.prenom} {p.players.nom}</td>
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
