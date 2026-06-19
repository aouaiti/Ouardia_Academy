import type { Payment, Player, PlayerFinancials } from "./types";

export function toMonthKey(annee: number, mois: number): number {
  return annee * 12 + mois;
}

export function fromMonthKey(key: number): { annee: number; mois: number } {
  const mois = ((key - 1) % 12) + 1;
  const annee = Math.floor((key - 1) / 12);
  return { annee, mois };
}

export function monthsInRange(
  startAnnee: number,
  startMois: number,
  endAnnee: number,
  endMois: number
): { annee: number; mois: number }[] {
  const result: { annee: number; mois: number }[] = [];
  const endKey = toMonthKey(endAnnee, endMois);
  let key = toMonthKey(startAnnee, startMois);

  while (key <= endKey) {
    result.push(fromMonthKey(key));
    key++;
  }
  return result;
}

export function computePlayerFinancials(
  player: Pick<Player, "id" | "mois_inscription" | "annee_inscription" | "tarif_mensuel">,
  payments: Pick<Payment, "player_id" | "mois" | "annee" | "montant">[],
  calcStart: { mois: number; annee: number },
  periodEnd: { mois: number; annee: number }
): PlayerFinancials {
  const playerStartKey = toMonthKey(player.annee_inscription, player.mois_inscription);
  const calcStartKey = toMonthKey(calcStart.annee, calcStart.mois);
  const endKey = toMonthKey(periodEnd.annee, periodEnd.mois);
  const effectiveStartKey = Math.max(playerStartKey, calcStartKey);

  if (effectiveStartKey > endKey) {
    return { totalDu: 0, totalPaye: 0, dette: 0, moisDus: 0, moisPayes: 0 };
  }

  const { annee: startAnnee, mois: startMois } = fromMonthKey(effectiveStartKey);
  const dueMonths = monthsInRange(startAnnee, startMois, periodEnd.annee, periodEnd.mois);
  const tarif = Number(player.tarif_mensuel);
  const totalDu = dueMonths.length * tarif;

  const paymentsInRange = payments.filter((p) => {
    if (p.player_id !== player.id) return false;
    const k = toMonthKey(p.annee, p.mois);
    return k >= effectiveStartKey && k <= endKey;
  });

  const totalPaye = paymentsInRange.reduce((s, p) => s + Number(p.montant), 0);

  return {
    totalDu,
    totalPaye,
    dette: Math.max(0, totalDu - totalPaye),
    moisDus: dueMonths.length,
    moisPayes: paymentsInRange.length,
  };
}

export function computePeriodStats(
  players: Pick<Player, "id" | "mois_inscription" | "annee_inscription" | "tarif_mensuel">[],
  payments: Pick<Payment, "player_id" | "mois" | "annee" | "montant">[],
  calcStart: { mois: number; annee: number },
  periodEnd: { mois: number; annee: number }
) {
  let totalDu = 0;
  let totalPaye = 0;

  for (const player of players) {
    const f = computePlayerFinancials(player, payments, calcStart, periodEnd);
    totalDu += f.totalDu;
    totalPaye += f.totalPaye;
  }

  return {
    totalDu,
    totalPaye,
    totalDette: Math.max(0, totalDu - totalPaye),
  };
}

export function computeMonthlyExpected(
  players: Pick<Player, "id" | "mois_inscription" | "annee_inscription" | "tarif_mensuel">[],
  annee: number,
  mois: number
): number {
  const key = toMonthKey(annee, mois);
  return players.reduce((sum, p) => {
    const joinKey = toMonthKey(p.annee_inscription, p.mois_inscription);
    if (joinKey <= key) return sum + Number(p.tarif_mensuel);
    return sum;
  }, 0);
}
