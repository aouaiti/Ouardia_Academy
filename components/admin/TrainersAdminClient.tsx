"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTrainer, updateTrainer, deactivateTrainer, activateTrainer, deleteTrainer } from "@/app/actions/trainers";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Trainer } from "@/lib/types";
import { UserPlus, Loader2, Pencil, Trash2 } from "lucide-react";

export function TrainersAdminClient({
  trainers,
  canManage,
  canAdd,
}: {
  trainers: Trainer[];
  canManage: boolean;
  canAdd: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editTrainer, setEditTrainer] = useState<Trainer | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ nom: "", prenom: "", telephone: "" });

  function handleCreate() {
    setError("");
    startTransition(async () => {
      const result = await createTrainer(form);
      if (result.error) setError(result.error);
      else {
        setShowForm(false);
        setForm({ nom: "", prenom: "", telephone: "" });
      }
    });
  }

  function handleUpdate() {
    if (!editTrainer) return;
    setError("");
    startTransition(async () => {
      const result = await updateTrainer(editTrainer.id, {
        nom: editTrainer.nom,
        prenom: editTrainer.prenom,
        telephone: editTrainer.telephone ?? undefined,
      });
      if (result.error) setError(result.error);
      else setEditTrainer(null);
    });
  }

  function handleToggleActive(t: Trainer) {
    const msg = t.actif ? "Désactiver cet entraîneur ?" : "Réactiver cet entraîneur ?";
    if (!confirm(msg)) return;
    startTransition(async () => {
      if (t.actif) await deactivateTrainer(t.id);
      else await activateTrainer(t.id);
    });
  }

  function handleDeleteTrainer(t: Trainer) {
    if (!confirm(`Supprimer définitivement l'entraîneur ${t.prenom} ${t.nom} ?`)) return;
    setError("");
    startTransition(async () => {
      const result = await deleteTrainer(t.id);
      if (result.error) setError(result.error);
      else {
        if (editTrainer?.id === t.id) setEditTrainer(null);
        router.refresh();
      }
    });
  }

  return (
    <>
      <PageHeader
        title="Gestion des entraîneurs"
        description={canManage ? "Ajouter et modifier les entraîneurs" : "Ajouter un nouvel entraîneur"}
        actions={
          canAdd ? (
            <Button variant="primary" size="sm" onClick={() => { setShowForm(!showForm); setEditTrainer(null); }}>
              <UserPlus className="h-4 w-4" /> Ajouter
            </Button>
          ) : undefined
        }
      />

      {canAdd && showForm && (
        <Card className="mb-6">
          <h2 className="mb-4 font-semibold">Nouvel entraîneur</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <input placeholder="Prénom" className="rounded-lg border border-border px-3 py-2 text-sm" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
            <input placeholder="Nom" className="rounded-lg border border-border px-3 py-2 text-sm" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
            <input placeholder="Téléphone" className="rounded-lg border border-border px-3 py-2 text-sm" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
          </div>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          <Button variant="primary" className="mt-4" disabled={pending} onClick={handleCreate}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Créer
          </Button>
        </Card>
      )}

      {canManage && editTrainer && (
        <Card className="mb-6 border-primary/30">
          <h2 className="mb-4 font-semibold">Modifier l&apos;entraîneur</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <input className="rounded-lg border border-border px-3 py-2 text-sm" value={editTrainer.prenom} onChange={(e) => setEditTrainer({ ...editTrainer, prenom: e.target.value })} />
            <input className="rounded-lg border border-border px-3 py-2 text-sm" value={editTrainer.nom} onChange={(e) => setEditTrainer({ ...editTrainer, nom: e.target.value })} />
            <input className="rounded-lg border border-border px-3 py-2 text-sm" value={editTrainer.telephone ?? ""} onChange={(e) => setEditTrainer({ ...editTrainer, telephone: e.target.value })} />
          </div>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          <div className="mt-4 flex gap-2">
            <Button variant="primary" disabled={pending} onClick={handleUpdate}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
            </Button>
            <Button variant="ghost" onClick={() => setEditTrainer(null)}>Annuler</Button>
          </div>
        </Card>
      )}

      <Card>
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-muted">Nom</th>
              <th className="px-3 py-2 text-left font-medium text-muted">Téléphone</th>
              <th className="px-3 py-2 text-left font-medium text-muted">Statut</th>
              {canManage && <th className="px-3 py-2 text-right font-medium text-muted">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {trainers.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2">{t.prenom} {t.nom}</td>
                <td className="px-3 py-2">{t.telephone ?? "—"}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${t.actif ? "bg-green-100 text-success" : "bg-gray-100 text-muted"}`}>
                    {t.actif ? "Actif" : "Inactif"}
                  </span>
                </td>
                {canManage && (
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setEditTrainer(t); setShowForm(false); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleToggleActive(t)}>
                      {t.actif ? "Désactiver" : "Réactiver"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteTrainer(t)} title="Supprimer">
                      <Trash2 className="h-3 w-3 text-danger" />
                    </Button>
                  </div>
                </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
