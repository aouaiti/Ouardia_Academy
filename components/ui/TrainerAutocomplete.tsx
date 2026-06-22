"use client";

import { useMemo } from "react";

interface TrainerOption {
  id: string;
  nom: string;
  prenom: string;
}

interface Props {
  trainers: TrainerOption[];
  value: string;
  onChange: (trainerId: string) => void;
  search: string;
  onSearchChange: (q: string) => void;
  label?: string;
  placeholder?: string;
}

export function TrainerAutocomplete({
  trainers,
  value,
  onChange,
  search,
  onSearchChange,
  label = "Entraîneur",
  placeholder = "Nom ou prénom…",
}: Props) {
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return trainers.slice(0, 20);
    return trainers
      .filter((t) => `${t.prenom} ${t.nom}`.toLowerCase().includes(q))
      .slice(0, 20);
  }, [trainers, search]);

  const selected = trainers.find((t) => t.id === value);

  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        type="text"
        list={`trainer-list-${label.replace(/\s/g, "-")}`}
        placeholder={placeholder}
        className="mb-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
        value={search}
        onChange={(e) => {
          onSearchChange(e.target.value);
          const match = trainers.find(
            (t) => `${t.prenom} ${t.nom}`.toLowerCase() === e.target.value.toLowerCase()
          );
          if (match) onChange(match.id);
          else if (!e.target.value.trim()) onChange("");
        }}
      />
      <datalist id={`trainer-list-${label.replace(/\s/g, "-")}`}>
        {filtered.map((t) => (
          <option key={t.id} value={`${t.prenom} ${t.nom}`} />
        ))}
      </datalist>
      <select
        className="w-full rounded-lg border border-border px-3 py-2 text-sm"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          const t = trainers.find((tr) => tr.id === e.target.value);
          if (t) onSearchChange(`${t.prenom} ${t.nom}`);
          else onSearchChange("");
        }}
      >
        <option value="">Tous</option>
        {filtered.map((t) => (
          <option key={t.id} value={t.id}>
            {t.prenom} {t.nom}
          </option>
        ))}
      </select>
      {selected && (
        <p className="mt-1 text-xs text-muted">Sélectionné : {selected.prenom} {selected.nom}</p>
      )}
    </div>
  );
}
