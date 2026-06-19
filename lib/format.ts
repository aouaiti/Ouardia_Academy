const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export function formatMontant(montant: number): string {
  return `${montant.toFixed(2)} DT`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function moisLabel(mois: number): string {
  return MOIS[mois - 1] ?? String(mois);
}

export function moisOptions(): { value: number; label: string }[] {
  return MOIS.map((label, i) => ({ value: i + 1, label }));
}

export function anneeOptions(yearsBack = 5): number[] {
  const current = new Date().getFullYear();
  return Array.from({ length: yearsBack + 1 }, (_, i) => current - i);
}

export function generateReceiptNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `REC-${date}-${rand}`;
}
