import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AuditLogEntry, AuditLogFilters, DashboardFilters, Payment, PaymentHistoryFilters, PlayerRow } from "@/lib/types";
import { formatDateTime, formatMontant, moisLabel } from "@/lib/format";

interface ExportStats {
  totalEncaisse: number;
  totalAttendu: number;
  nbPayes: number;
  nbNonPayes: number;
  periodTotalDu?: number;
  periodTotalPaye?: number;
  periodTotalDette?: number;
}

function filterDescription(filters: DashboardFilters, calcStart?: { mois: number; annee: number }): string[] {
  const lines: string[] = [];
  lines.push(`Période affichée : ${moisLabel(filters.mois)} ${filters.annee}`);
  if (calcStart) {
    lines.push(`Calcul des dues depuis : ${moisLabel(calcStart.mois)} ${calcStart.annee}`);
  }
  if (filters.statut) lines.push(`Statut : ${filters.statut === "paye" ? "Payé" : "Non payé"}`);
  if (filters.anneeNaissance) lines.push(`Catégorie : ${filters.anneeNaissance}`);
  if (filters.datePaiement) lines.push(`Date de paiement : ${filters.datePaiement}`);
  return lines;
}

export function exportDashboardPDF(
  rows: PlayerRow[],
  filters: DashboardFilters,
  stats: ExportStats,
  calcStart?: { mois: number; annee: number },
  title = "Rapport d'encaissement"
) {
  const doc = new jsPDF();
  const desc = filterDescription(filters, calcStart);
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  desc.forEach((line, i) => doc.text(line, 14, 30 + i * 6));

  const startY = 30 + desc.length * 6 + 6;
  doc.text(`Payés : ${stats.nbPayes}  |  Non payés : ${stats.nbNonPayes}`, 14, startY);
  doc.text(`Encaissé (mois) : ${formatMontant(stats.totalEncaisse)}  |  Attendu (mois) : ${formatMontant(stats.totalAttendu)}`, 14, startY + 6);
  if (stats.periodTotalDette !== undefined) {
    doc.text(
      `Total payé (période) : ${formatMontant(stats.periodTotalPaye ?? 0)}  |  Total dû : ${formatMontant(stats.periodTotalDu ?? 0)}  |  Dette : ${formatMontant(stats.periodTotalDette)}`,
      14,
      startY + 12
    );
  }

  autoTable(doc, {
    startY: startY + 22,
    head: [["Joueur", "Catégorie", "Statut mois", "Total payé", "Total dû", "Dette"]],
    body: rows.map((r) => [
      `${r.prenom} ${r.nom}`,
      String(r.annee_naissance),
      r.paye ? "Payé" : "Non payé",
      formatMontant(r.financials.totalPaye),
      formatMontant(r.financials.totalDu),
      formatMontant(r.financials.dette),
    ]),
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 2) {
        const val = data.cell.raw as string;
        if (val === "Payé") data.cell.styles.textColor = [22, 163, 74];
        if (val === "Non payé") data.cell.styles.textColor = [220, 38, 38];
      }
    },
  });

  doc.save(`rapport-${filters.annee}-${filters.mois}.pdf`);
}

export function exportDebtPDF(
  rows: PlayerRow[],
  filters: DashboardFilters,
  stats: ExportStats,
  calcStart: { mois: number; annee: number }
) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Rapport des dettes", 14, 20);
  doc.setFontSize(10);
  filterDescription(filters, calcStart).forEach((line, i) => doc.text(line, 14, 30 + i * 6));

  const startY = 30 + filterDescription(filters, calcStart).length * 6 + 8;
  doc.text(`Dette totale : ${formatMontant(stats.periodTotalDette ?? 0)}`, 14, startY);

  const debtRows = rows.filter((r) => r.financials.dette > 0).sort((a, b) => b.financials.dette - a.financials.dette);

  autoTable(doc, {
    startY: startY + 10,
    head: [["Joueur", "Inscription", "Mois dus", "Total payé", "Total dû", "Dette"]],
    body: debtRows.map((r) => [
      `${r.prenom} ${r.nom}`,
      `${moisLabel(r.mois_inscription)} ${r.annee_inscription}`,
      String(r.financials.moisDus),
      formatMontant(r.financials.totalPaye),
      formatMontant(r.financials.totalDu),
      formatMontant(r.financials.dette),
    ]),
  });

  doc.save(`dettes-${filters.annee}-${filters.mois}.pdf`);
}

export function exportYearlyPDF(
  annee: number,
  calcStart: { mois: number; annee: number },
  yearStats: {
    totalEncaisse: number;
    totalAttendu: number;
    totalDette: number;
    monthly: { mois: number; montant: number; attendu: number }[];
  },
  rows: PlayerRow[]
) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`Rapport annuel ${annee}`, 14, 20);
  doc.setFontSize(10);
  doc.text(`Calcul depuis : ${moisLabel(calcStart.mois)} ${calcStart.annee}`, 14, 30);
  doc.text(`Encaissé : ${formatMontant(yearStats.totalEncaisse)}`, 14, 38);
  doc.text(`Attendu : ${formatMontant(yearStats.totalAttendu)}`, 14, 44);
  doc.text(`Dette : ${formatMontant(yearStats.totalDette)}`, 14, 50);

  autoTable(doc, {
    startY: 58,
    head: [["Mois", "Encaissé", "Attendu", "Écart"]],
    body: yearStats.monthly.map((m) => [
      moisLabel(m.mois),
      formatMontant(m.montant),
      formatMontant(m.attendu),
      formatMontant(Math.max(0, m.attendu - m.montant)),
    ]),
  });

  const debtRows = rows.filter((r) => r.financials.dette > 0);
  if (debtRows.length > 0) {
    autoTable(doc, {
      startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10,
      head: [["Joueur", "Total payé", "Total dû", "Dette"]],
      body: debtRows.map((r) => [
        `${r.prenom} ${r.nom}`,
        formatMontant(r.financials.totalPaye),
        formatMontant(r.financials.totalDu),
        formatMontant(r.financials.dette),
      ]),
    });
  }

  doc.save(`rapport-annuel-${annee}.pdf`);
}

export function exportDashboardCSV(rows: PlayerRow[], filters: DashboardFilters) {
  const headers = ["Nom", "Prénom", "Catégorie", "Statut mois", "Total payé", "Total dû", "Dette"];
  const csvRows = rows.map((r) => [
    r.nom,
    r.prenom,
    r.annee_naissance,
    r.paye ? "Payé" : "Non payé",
    r.financials.totalPaye,
    r.financials.totalDu,
    r.financials.dette,
  ]);

  const csv = [headers, ...csvRows].map((row) => row.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rapport-${filters.annee}-${filters.mois}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface ReceiptData {
  numeroRecu: string;
  joueurNom: string;
  joueurPrenom: string;
  mois: number;
  annee: number;
  montant: number;
  datePaiement: string;
  appName?: string;
}

export function generateReceiptPDF(data: ReceiptData) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("Reçu de paiement", 105, 25, { align: "center" });
  doc.setFontSize(11);
  doc.text(data.appName ?? "Académie de Football", 105, 35, { align: "center" });
  doc.setDrawColor(22, 101, 52);
  doc.line(20, 42, 190, 42);

  const lines = [
    `N° reçu : ${data.numeroRecu}`,
    `Joueur : ${data.joueurPrenom} ${data.joueurNom}`,
    `Période : ${moisLabel(data.mois)} ${data.annee}`,
    `Montant : ${formatMontant(data.montant)}`,
    `Date : ${formatDateTime(data.datePaiement)}`,
  ];
  lines.forEach((line, i) => doc.text(line, 20, 55 + i * 10));

  doc.setFontSize(9);
  doc.text("Document généré automatiquement — conservez ce reçu.", 105, 120, { align: "center" });
  doc.save(`recu-${data.numeroRecu}.pdf`);
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
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
};

function auditFilterDescription(filters: AuditLogFilters): string[] {
  const lines: string[] = [];
  if (filters.dateFrom) lines.push(`Du : ${filters.dateFrom}`);
  if (filters.dateTo) lines.push(`Au : ${filters.dateTo}`);
  if (filters.action) lines.push(`Action : ${AUDIT_ACTION_LABELS[filters.action] ?? filters.action}`);
  if (filters.tableCible) lines.push(`Table : ${filters.tableCible}`);
  if (filters.search) lines.push(`Recherche : ${filters.search}`);
  return lines.length ? lines : ["Aucun filtre"];
}

export function exportAuditPDF(entries: AuditLogEntry[], filters: AuditLogFilters) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Journal d'audit", 14, 20);
  doc.setFontSize(10);
  auditFilterDescription(filters).forEach((line, i) => doc.text(line, 14, 30 + i * 6));
  const startY = 30 + auditFilterDescription(filters).length * 6 + 6;
  doc.text(`Total : ${entries.length} entrée(s)`, 14, startY);

  autoTable(doc, {
    startY: startY + 8,
    head: [["Date", "Utilisateur", "Action", "Cible", "Détails"]],
    body: entries.map((e) => [
      formatDateTime(e.created_at),
      e.app_users ? `${e.app_users.prenom} ${e.app_users.nom}` : "—",
      AUDIT_ACTION_LABELS[e.action] ?? e.action,
      e.table_cible ?? "—",
      e.details ? JSON.stringify(e.details).slice(0, 80) : "—",
    ]),
    styles: { fontSize: 8 },
  });

  doc.save(`journal-audit-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function paymentFilterDescription(filters: PaymentHistoryFilters, playerName?: string): string[] {
  const lines: string[] = [];
  if (playerName) lines.push(`Joueur : ${playerName}`);
  if (filters.mois) lines.push(`Mois : ${moisLabel(filters.mois)}`);
  if (filters.annee) lines.push(`Année : ${filters.annee}`);
  if (filters.datePaiement) lines.push(`Date paiement : ${filters.datePaiement}`);
  if (filters.numeroRecu) lines.push(`N° reçu : ${filters.numeroRecu}`);
  return lines.length ? lines : ["Tous les paiements"];
}

export function exportPaymentHistoryPDF(
  payments: (Payment & { players?: { nom: string; prenom: string } | null })[],
  filters: PaymentHistoryFilters,
  playerName?: string
) {
  const doc = new jsPDF();
  const desc = paymentFilterDescription(filters, playerName);
  doc.setFontSize(16);
  doc.text("Historique des paiements", 14, 20);
  doc.setFontSize(10);
  desc.forEach((line, i) => doc.text(line, 14, 30 + i * 6));

  const startY = 30 + desc.length * 6 + 6;
  const total = payments.reduce((s, p) => s + Number(p.montant), 0);
  doc.text(`Nombre : ${payments.length}  |  Total : ${formatMontant(total)}`, 14, startY);

  autoTable(doc, {
    startY: startY + 8,
    head: [["Joueur", "Période", "Montant", "N° reçu", "Date"]],
    body: payments.map((p) => [
      p.players ? `${p.players.prenom} ${p.players.nom}` : "—",
      `${moisLabel(p.mois)} ${p.annee}`,
      formatMontant(Number(p.montant)),
      p.numero_recu,
      formatDateTime(p.date_paiement),
    ]),
  });

  doc.save(`historique-paiements-${new Date().toISOString().slice(0, 10)}.pdf`);
}
