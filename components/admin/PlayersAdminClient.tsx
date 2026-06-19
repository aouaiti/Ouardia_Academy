"use client";

import { useState, useTransition } from "react";
import { createPlayer, updatePlayer, deactivatePlayer, activatePlayer, bulkReassignTrainer } from "@/app/actions/players";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatMontant, moisLabel, moisOptions, anneeOptions } from "@/lib/format";
import type { Player, Trainer } from "@/lib/types";
import { UserPlus, Loader2, Pencil } from "lucide-react";

interface Props {
  players: (Player & { trainers: Trainer | null })[];
  trainers: Trainer[];
  categories: number[];
  canManage: boolean;
  canAdd: boolean;
}

export function PlayersAdminClient({ players, trainers, categories, canManage, canAdd }: Props) {
  const now = new Date();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [bulkCategory, setBulkCategory] = useState<number | "">("");
  const [bulkTrainer, setBulkTrainer] = useState("");
  const [editPlayer, setEditPlayer] = useState<(Player & { trainers: Trainer | null }) | null>(null);
  const [form, setForm] = useState({
    nom: "", prenom: "", annee_naissance: now.getFullYear() - 10,
    entraineur_id: "", telephone: "", tarif_mensuel: 40,
    mois_inscription: now.getMonth() + 1,
    annee_inscription: now.getFullYear(),
  });

  function handleCreate() {
    setError("");
    startTransition(async () => {
      const result = await createPlayer({
        ...form,
        entraineur_id: form.entraineur_id || undefined,
        telephone: form.telephone || undefined,
      });
      if (result.error) setError(result.error);
      else {
        setShowForm(false);
        setForm({
          nom: "", prenom: "", annee_naissance: now.getFullYear() - 10,
          entraineur_id: "", telephone: "", tarif_mensuel: 40,
          mois_inscription: now.getMonth() + 1, annee_inscription: now.getFullYear(),
        });
      }
    });
  }

  function openEdit(p: Player & { trainers: Trainer | null }) {
    setEditPlayer(p);
    setShowForm(false);
    setError("");
  }

  function handleUpdate() {
    if (!editPlayer) return;
    setError("");
    startTransition(async () => {
      const result = await updatePlayer(editPlayer.id, {
        nom: editPlayer.nom,
        prenom: editPlayer.prenom,
        annee_naissance: editPlayer.annee_naissance,
        entraineur_id: editPlayer.entraineur_id || null,
        telephone: editPlayer.telephone ?? undefined,
        tarif_mensuel: Number(editPlayer.tarif_mensuel),
        mois_inscription: editPlayer.mois_inscription,
        annee_inscription: editPlayer.annee_inscription,
      });
      if (result.error) setError(result.error);
      else setEditPlayer(null);
    });
  }

  function handleToggleStatus(id: string, statut: Player["statut"]) {
    const msg = statut === "actif" ? "Marquer ce joueur comme inactif ?" : "Réactiver ce joueur ?";
    if (!confirm(msg)) return;
    startTransition(async () => {
      if (statut === "actif") await deactivatePlayer(id);
      else await activatePlayer(id);
    });
  }

  function handleBulkReassign() {
    if (!bulkCategory || !bulkTrainer) return;
    if (!confirm(`Réaffecter tous les joueurs actifs de la catégorie ${bulkCategory} ?`)) return;
    startTransition(async () => {
      const result = await bulkReassignTrainer(bulkCategory, bulkTrainer);
      if (result.error) setError(result.error);
    });
  }

  return (
    <>
      <PageHeader
        title="Gestion des joueurs"
        description={canManage ? "Ajouter, modifier et réaffecter les joueurs" : "Ajouter un nouveau joueur"}
        actions={
          canAdd ? (
            <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
              <UserPlus className="h-4 w-4" /> Ajouter
            </Button>
          ) : undefined
        }
      />

      {canManage && (
      <Card className="mb-6">
        <h2 className="mb-3 font-semibold">Réaffectation en masse</h2>
        <div className="flex flex-wrap gap-3">
          <select className="rounded-lg border border-border px-3 py-2 text-sm" value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value ? Number(e.target.value) : "")}>
            <option value="">Catégorie (année)</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="rounded-lg border border-border px-3 py-2 text-sm" value={bulkTrainer} onChange={(e) => setBulkTrainer(e.target.value)}>
            <option value="">Nouvel entraîneur</option>
            {trainers.filter((t) => t.actif).map((t) => (
              <option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>
            ))}
          </select>
          <Button variant="primary" size="sm" disabled={!bulkCategory || !bulkTrainer} onClick={handleBulkReassign}>
            Réaffecter
          </Button>
        </div>
      </Card>
      )}

      {canAdd && showForm && (
        <Card className="mb-6">
          <h2 className="mb-4 font-semibold">Nouveau joueur</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input placeholder="Prénom" className="rounded-lg border border-border px-3 py-2 text-sm" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
            <input placeholder="Nom" className="rounded-lg border border-border px-3 py-2 text-sm" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
            <input type="number" placeholder="Année de naissance" className="rounded-lg border border-border px-3 py-2 text-sm" value={form.annee_naissance} onChange={(e) => setForm({ ...form, annee_naissance: Number(e.target.value) })} />
            <select className="rounded-lg border border-border px-3 py-2 text-sm" value={form.entraineur_id} onChange={(e) => setForm({ ...form, entraineur_id: e.target.value })}>
              <option value="">Entraîneur</option>
              {trainers.filter((t) => t.actif).map((t) => (
                <option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>
              ))}
            </select>
            <input placeholder="Téléphone" className="rounded-lg border border-border px-3 py-2 text-sm" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
            <input type="number" placeholder="Tarif mensuel" className="rounded-lg border border-border px-3 py-2 text-sm" value={form.tarif_mensuel} onChange={(e) => setForm({ ...form, tarif_mensuel: Number(e.target.value) })} />
            <select className="rounded-lg border border-border px-3 py-2 text-sm" value={form.mois_inscription} onChange={(e) => setForm({ ...form, mois_inscription: Number(e.target.value) })}>
              {moisOptions().map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select className="rounded-lg border border-border px-3 py-2 text-sm" value={form.annee_inscription} onChange={(e) => setForm({ ...form, annee_inscription: Number(e.target.value) })}>
              {anneeOptions(10).map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <p className="mt-2 text-xs text-muted">Mois/année d&apos;inscription à l&apos;académie — utilisé pour le calcul des cotisations dues.</p>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          <Button variant="primary" className="mt-4" disabled={pending} onClick={handleCreate}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Créer
          </Button>
        </Card>
      )}

      {canManage && editPlayer && (
        <Card className="mb-6 border-primary/30">
          <h2 className="mb-4 font-semibold">Modifier le joueur</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input placeholder="Prénom" className="rounded-lg border border-border px-3 py-2 text-sm" value={editPlayer.prenom} onChange={(e) => setEditPlayer({ ...editPlayer, prenom: e.target.value })} />
            <input placeholder="Nom" className="rounded-lg border border-border px-3 py-2 text-sm" value={editPlayer.nom} onChange={(e) => setEditPlayer({ ...editPlayer, nom: e.target.value })} />
            <input type="number" placeholder="Année de naissance" className="rounded-lg border border-border px-3 py-2 text-sm" value={editPlayer.annee_naissance} onChange={(e) => setEditPlayer({ ...editPlayer, annee_naissance: Number(e.target.value) })} />
            <select className="rounded-lg border border-border px-3 py-2 text-sm" value={editPlayer.entraineur_id ?? ""} onChange={(e) => setEditPlayer({ ...editPlayer, entraineur_id: e.target.value || null })}>
              <option value="">Entraîneur</option>
              {trainers.filter((t) => t.actif).map((t) => (
                <option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>
              ))}
            </select>
            <input placeholder="Téléphone" className="rounded-lg border border-border px-3 py-2 text-sm" value={editPlayer.telephone ?? ""} onChange={(e) => setEditPlayer({ ...editPlayer, telephone: e.target.value })} />
            <input type="number" placeholder="Tarif mensuel" className="rounded-lg border border-border px-3 py-2 text-sm" value={editPlayer.tarif_mensuel} onChange={(e) => setEditPlayer({ ...editPlayer, tarif_mensuel: Number(e.target.value) })} />
            <select className="rounded-lg border border-border px-3 py-2 text-sm" value={editPlayer.mois_inscription} onChange={(e) => setEditPlayer({ ...editPlayer, mois_inscription: Number(e.target.value) })}>
              {moisOptions().map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select className="rounded-lg border border-border px-3 py-2 text-sm" value={editPlayer.annee_inscription} onChange={(e) => setEditPlayer({ ...editPlayer, annee_inscription: Number(e.target.value) })}>
              {anneeOptions(10).map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          <div className="mt-4 flex gap-2">
            <Button variant="primary" disabled={pending} onClick={handleUpdate}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
            </Button>
            <Button variant="ghost" onClick={() => setEditPlayer(null)}>Annuler</Button>
          </div>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted">Joueur</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Catégorie</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Entraîneur</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Tarif</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Inscription</th>
                <th className="px-3 py-2 text-left font-medium text-muted">Statut</th>
                {canManage && <th className="px-3 py-2 text-right font-medium text-muted">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">{p.prenom} {p.nom}</td>
                  <td className="px-3 py-2">{p.annee_naissance}</td>
                  <td className="px-3 py-2">{p.trainers ? `${p.trainers.prenom} ${p.trainers.nom}` : "—"}</td>
                  <td className="px-3 py-2">{formatMontant(Number(p.tarif_mensuel))}</td>
                  <td className="px-3 py-2">{moisLabel(p.mois_inscription ?? 1)} {p.annee_inscription ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${p.statut === "actif" ? "bg-green-100 text-success" : "bg-gray-100 text-muted"}`}>
                      {p.statut === "actif" ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  {canManage && (
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(p.id, p.statut)}>
                        {p.statut === "actif" ? "Désactiver" : "Réactiver"}
                      </Button>
                    </div>
                  </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
