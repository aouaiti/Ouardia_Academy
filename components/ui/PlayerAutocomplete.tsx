"use client";

import { useMemo } from "react";

interface PlayerOption {
  id: string;
  nom: string;
  prenom: string;
  annee_naissance?: number;
}

interface Props {
  players: PlayerOption[];
  value: string;
  onChange: (playerId: string) => void;
  search: string;
  onSearchChange: (q: string) => void;
  label?: string;
  placeholder?: string;
}

export function PlayerAutocomplete({
  players,
  value,
  onChange,
  search,
  onSearchChange,
  label = "Joueur",
  placeholder = "Nom ou prénom…",
}: Props) {
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return players.slice(0, 20);
    return players
      .filter((p) => `${p.prenom} ${p.nom}`.toLowerCase().includes(q))
      .slice(0, 20);
  }, [players, search]);

  const selected = players.find((p) => p.id === value);

  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        type="text"
        list={`player-list-${label.replace(/\s/g, "-")}`}
        placeholder={placeholder}
        className="mb-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
        value={search}
        onChange={(e) => {
          onSearchChange(e.target.value);
          const match = players.find(
            (p) => `${p.prenom} ${p.nom}`.toLowerCase() === e.target.value.toLowerCase()
          );
          if (match) onChange(match.id);
        }}
      />
      <datalist id={`player-list-${label.replace(/\s/g, "-")}`}>
        {filtered.map((p) => (
          <option key={p.id} value={`${p.prenom} ${p.nom}`} />
        ))}
      </datalist>
      <select
        className="w-full rounded-lg border border-border px-3 py-2 text-sm"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          const p = players.find((pl) => pl.id === e.target.value);
          if (p) onSearchChange(`${p.prenom} ${p.nom}`);
        }}
      >
        <option value="">Tous / sélectionner</option>
        {filtered.map((p) => (
          <option key={p.id} value={p.id}>
            {p.prenom} {p.nom}
            {p.annee_naissance ? ` (${p.annee_naissance})` : ""}
          </option>
        ))}
      </select>
      {selected && (
        <p className="mt-1 text-xs text-muted">Sélectionné : {selected.prenom} {selected.nom}</p>
      )}
    </div>
  );
}
