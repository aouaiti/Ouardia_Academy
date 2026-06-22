"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPlayer, updatePlayer, deactivatePlayer, activatePlayer, bulkReassignTrainer, importPlayersCsv, deletePlayer } from "@/app/actions/players";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PlayerAutocomplete } from "@/components/ui/PlayerAutocomplete";
import { TrainerAutocomplete } from "@/components/ui/TrainerAutocomplete";
import { formatMontant, moisLabel, moisOptions, anneeOptions } from "@/lib/format";
import { exportPlayersPDF } from "@/lib/pdf";
import type { Player, Trainer, UserRole } from "@/lib/types";
import { hasPermission } from "@/lib/permissions";
import { UserPlus, Loader2, Pencil, Download, Upload, Trash2, FileDown } from "lucide-react";

interface Props {
  players: (Player & { trainers: Trainer | null })[];
  trainers: Trainer[];
  categories: number[];
  canManage: boolean;
  canAdd: boolean;
  role: UserRole;
}

export function PlayersAdminClient({ players, trainers, categories, canManage, canAdd, role }: Props) {
  const router = useRouter();
  const editFormRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [bulkCategory, setBulkCategory] = useState<number | "">("");
  const [bulkTrainer, setBulkTrainer] = useState("");
  const [importTrainer, setImportTrainer] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMessage, setImportMessage] = useState("");
  const [importError, setImportError] = useState("");
  const [filterPlayerId, setFilterPlayerId] = useState("");
  const [filterPlayerSearch, setFilterPlayerSearch] = useState("");
  const [filterTrainerId, setFilterTrainerId] = useState("");
  const [filterTrainerSearch, setFilterTrainerSearch] = useState("");
  const [filterYear, setFilterYear] = useState<number | "">("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [editPlayer, setEditPlayer] = useState<(Player & { trainers: Trainer | null }) | null>(null);
  const [form, setForm] = useState({
    nom: "", prenom: "", annee_naissance: now.getFullYear() - 10,
    entraineur_id: "", telephone: "", tarif_mensuel: 40,
    mois_inscription: now.getMonth() + 1,
    annee_inscription: now.getFullYear(),
  });

  const birthYears = useMemo(
    () => [...new Set(players.map((p) => p.annee_naissance))].sort((a, b) => b - a),
    [players]
  );

  const filteredPlayers = useMemo(() => {
    let list = [...players];

    if (filterPlayerId) {
      list = list.filter((p) => p.id === filterPlayerId);
    } else if (filterPlayerSearch.trim()) {
      const q = filterPlayerSearch.toLowerCase().trim();
      list = list.filter((p) => `${p.prenom} ${p.nom}`.toLowerCase().includes(q));
    }

    if (filterTrainerId) {
      list = list.filter((p) => p.entraineur_id === filterTrainerId);
    } else if (filterTrainerSearch.trim()) {
      const q = filterTrainerSearch.toLowerCase().trim();
      list = list.filter((p) => {
        if (!p.trainers) return false;
        return `${p.trainers.prenom} ${p.trainers.nom}`.toLowerCase().includes(q);
      });
    }

    if (filterYear) {
      list = list.filter((p) => p.annee_naissance === filterYear);
    }

    list.sort((a, b) => {
      const nameA = `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`, "fr");
      return sortOrder === "asc" ? nameA : -nameA;
    });

    return list;
  }, [players, filterPlayerId, filterPlayerSearch, filterTrainerId, filterTrainerSearch, filterYear, sortOrder]);

  useEffect(() => {
    if (editPlayer && editFormRef.current) {
      editFormRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [editPlayer]);

  function resetFilters() {
    setFilterPlayerId("");
    setFilterPlayerSearch("");
    setFilterTrainerId("");
    setFilterTrainerSearch("");
    setFilterYear("");
    setSortOrder("asc");
  }

  function handleExportPdf() {
    const selectedPlayer = filterPlayerId ? players.find((p) => p.id === filterPlayerId) : undefined;
    const selectedTrainer = filterTrainerId ? trainers.find((t) => t.id === filterTrainerId) : undefined;
    exportPlayersPDF(filteredPlayers, {
      playerLabel: selectedPlayer
        ? `${selectedPlayer.prenom} ${selectedPlayer.nom}`
        : filterPlayerSearch.trim() || undefined,
      trainerLabel: selectedTrainer
        ? `${selectedTrainer.prenom} ${selectedTrainer.nom}`
        : filterTrainerSearch.trim() || undefined,
      year: filterYear || undefined,
      sortOrder,
    });
  }

  const canExport = hasPermission(role, "exportReports");

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

  function parseCsvLine(line: string) {
    // Support comma or semicolon as separator (depending on how the CSV is generated).
    const delimiter = line.includes(";") && !line.includes(",") ? ";" : ",";
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        cells.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  }

  function normalizeHeader(h: string) {
    const s = h.trim().replace(/\uFEFF/g, ""); // Remove BOM if present
    // Remove accents/diacritics and normalize to simple snake_case.
    return s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
  }

  function parsePlayersCsv(content: string) {
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      throw new Error("Le CSV est vide.");
    }

    const headers = parseCsvLine(lines[0]).map(normalizeHeader);
    const idxFirst = (names: string[]) => {
      for (const n of names) {
        const i = headers.indexOf(n);
        if (i !== -1) return i;
      }
      return -1;
    };

    const prenomIdx = idxFirst(["prenom"]);
    const nomIdx = idxFirst(["nom"]);
    const anneeNaissanceIdx = idxFirst(["annee_naissance", "annee_de_naissance"]);
    const missing: string[] = [];
    if (prenomIdx === -1) missing.push("prenom");
    if (nomIdx === -1) missing.push("nom");
    if (anneeNaissanceIdx === -1) missing.push("annee_naissance");
    if (missing.length > 0) throw new Error(`Colonnes manquantes: ${missing.join(", ")}`);

    const telephoneIdx = idxFirst(["telephone", "tel"]);
    const tarifIdx = idxFirst(["tarif_mensuel", "tarif", "tarifmensuel"]);
    const moisIdx = idxFirst(["mois_inscription", "mois"]);
    const anneeInscriptionIdx = idxFirst(["annee_inscription", "annee_inscr"]);

    return lines.slice(1).map((line) => {
      const cols = parseCsvLine(line);
      return {
        prenom: cols[prenomIdx] ?? "",
        nom: cols[nomIdx] ?? "",
        annee_naissance: Number(cols[anneeNaissanceIdx] ?? ""),
        telephone: telephoneIdx !== -1 ? (cols[telephoneIdx] ?? "").trim() || undefined : undefined,
        tarif_mensuel: tarifIdx !== -1 && cols[tarifIdx] ? Number(cols[tarifIdx]) : undefined,
        mois_inscription: moisIdx !== -1 && cols[moisIdx] ? Number(cols[moisIdx]) : undefined,
        annee_inscription: anneeInscriptionIdx !== -1 && cols[anneeInscriptionIdx] ? Number(cols[anneeInscriptionIdx]) : undefined,
      };
    });
  }

  function handleImportCsv() {
    if (!importFile || !importTrainer) {
      setImportError("Sélectionnez un fichier CSV et un entraîneur.");
      setImportMessage("");
      return;
    }
    setError("");
    setImportError("");
    setImportMessage("");
    startTransition(async () => {
      try {
        const content = await importFile.text();
        const rows = parsePlayersCsv(content);
        const result = await importPlayersCsv(rows, importTrainer);
        if (result.error) {
          setImportError(result.error);
          return;
        }
        setImportFile(null);
        setImportMessage(`${result.count ?? 0} joueur(s) importé(s) avec succès.`);
        router.refresh();
      } catch (e) {
        setImportError(e instanceof Error ? e.message : "Fichier CSV invalide. Vérifiez le modèle et les colonnes.");
      }
    });
  }

  function handleDeletePlayer(player: Player) {
    if (!confirm(`Supprimer définitivement ${player.prenom} ${player.nom} ?`)) return;
    setError("");
    startTransition(async () => {
      const result = await deletePlayer(player.id);
      if (result.error) setError(result.error);
      else {
        if (editPlayer?.id === player.id) setEditPlayer(null);
        router.refresh();
      }
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
        <h2 className="mb-3 font-semibold">Import CSV des joueurs</h2>
        <p className="mb-3 text-xs text-muted">Téléchargez le modèle vide, remplissez-le, puis importez-le en choisissant l&apos;entraîneur.</p>
        <div className="flex flex-wrap items-center gap-3">
          <a href="/templates/players-import-template.csv" download>
            <Button variant="outline" size="sm" type="button">
              <Download className="h-4 w-4" /> Télécharger le modèle
            </Button>
          </a>
          <input
            type="file"
            accept=".csv,text/csv"
            className="cursor-pointer rounded-lg border border-border px-3 py-2 text-sm"
            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
          />
          <select className="rounded-lg border border-border px-3 py-2 text-sm" value={importTrainer} onChange={(e) => setImportTrainer(e.target.value)}>
            <option value="">Entraîneur pour l&apos;import</option>
            {trainers.filter((t) => t.actif).map((t) => (
              <option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>
            ))}
          </select>
          <Button variant="primary" size="sm" disabled={!importFile || !importTrainer || pending} onClick={handleImportCsv}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Importer
          </Button>
        </div>
        {importError && <p className="mt-2 text-sm text-danger">{importError}</p>}
        {importMessage && <p className="mt-2 text-sm text-success">{importMessage}</p>}
      </Card>
      )}

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
        <div ref={editFormRef}>
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
        </div>
      )}

      <Card>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PlayerAutocomplete
            players={players}
            value={filterPlayerId}
            onChange={setFilterPlayerId}
            search={filterPlayerSearch}
            onSearchChange={setFilterPlayerSearch}
            label="Filtrer par joueur"
            placeholder="Nom ou prénom…"
          />
          <TrainerAutocomplete
            trainers={trainers}
            value={filterTrainerId}
            onChange={setFilterTrainerId}
            search={filterTrainerSearch}
            onSearchChange={setFilterTrainerSearch}
            label="Filtrer par entraîneur"
            placeholder="Nom ou prénom…"
          />
          <div>
            <label className="mb-1 block text-sm font-medium">Filtrer par année</label>
            <select
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Toutes</option>
              {birthYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Tri alphabétique</label>
            <select
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
            >
              <option value="asc">A → Z</option>
              <option value="desc">Z → A</option>
            </select>
          </div>
        </div>
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="text-sm text-muted">
            {filteredPlayers.length} joueur{filteredPlayers.length !== 1 ? "s" : ""} affiché{filteredPlayers.length !== 1 ? "s" : ""}
          </p>
          <div className="flex gap-2">
            {canExport && (
              <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={filteredPlayers.length === 0}>
                <FileDown className="h-4 w-4" /> PDF
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Réinitialiser les filtres
            </Button>
          </div>
        </div>
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
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="px-3 py-8 text-center text-muted">
                    Aucun joueur ne correspond aux filtres.
                  </td>
                </tr>
              ) : filteredPlayers.map((p) => (
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
                      <Button variant="ghost" size="sm" onClick={() => handleDeletePlayer(p)} title="Supprimer">
                        <Trash2 className="h-3 w-3 text-danger" />
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
