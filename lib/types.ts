export type UserRole = "admin" | "editor" | "user";
export type PlayerStatus = "actif" | "inactif";

export interface AppUser {
  id: string;
  nom: string;
  prenom: string;
  role: UserRole;
  actif: boolean;
  created_at: string;
}

export interface Trainer {
  id: string;
  nom: string;
  prenom: string;
  telephone: string | null;
  actif: boolean;
  created_at: string;
}

export interface Player {
  id: string;
  nom: string;
  prenom: string;
  annee_naissance: number;
  entraineur_id: string | null;
  telephone: string | null;
  tarif_mensuel: number;
  statut: PlayerStatus;
  date_inscription: string;
  mois_inscription: number;
  annee_inscription: number;
  created_at: string;
  trainers?: Trainer | null;
}

export interface AppSettings {
  id: number;
  app_name: string;
  app_description: string;
  logo_url: string | null;
  primary_color: string;
  primary_dark: string;
  primary_light: string;
  updated_at: string;
}

export interface PlayerFinancials {
  totalDu: number;
  totalPaye: number;
  dette: number;
  moisDus: number;
  moisPayes: number;
}

export interface Payment {
  id: string;
  player_id: string;
  mois: number;
  annee: number;
  montant: number;
  date_paiement: string;
  enregistre_par: string;
  numero_recu: string;
  created_at: string;
  players?: Player;
  app_users?: AppUser;
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  table_cible: string | null;
  id_cible: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  app_users?: AppUser;
}

export interface DashboardFilters {
  statut?: "paye" | "non_paye";
  anneeNaissance?: number;
  mois: number;
  annee: number;
  joueurId?: string;
  entraineurId?: string;
  datePaiement?: string;
  calcMois?: number;
  calcAnnee?: number;
}

export interface PlayerRow extends Player {
  payment?: Payment | null;
  paye: boolean;
  financials: PlayerFinancials;
}

export interface PaymentHistoryFilters {
  joueurId?: string;
  categorie?: number;
  mois?: number;
  annee?: number;
  datePaiement?: string;
  numeroRecu?: string;
}

export interface AuditLogFilters {
  dateFrom?: string;
  dateTo?: string;
  action?: string;
  userId?: string;
  tableCible?: string;
  search?: string;
}

export const DEFAULT_TENU_PRIX = 60;

export interface PlayerTenu {
  id: string;
  player_id: string;
  prix: number;
  created_at: string;
}

export interface TenuPayment {
  id: string;
  player_id: string;
  montant: number;
  date_paiement: string;
  enregistre_par: string;
  numero_recu: string;
  created_at: string;
  players?: Player;
  app_users?: AppUser;
}

export interface TenuDashboardFilters {
  statut?: "paye" | "non_paye" | "partiel";
  anneeNaissance?: number;
  joueurId?: string;
  entraineurId?: string;
  datePaiement?: string;
}

export interface TenuPaymentHistoryFilters {
  joueurId?: string;
  categorie?: number;
  datePaiement?: string;
  numeroRecu?: string;
}

export interface TenuPlayerRow extends Player {
  prix: number;
  totalPaye: number;
  reste: number;
  paye: boolean;
  partiel: boolean;
  trainers?: Trainer | null;
}

export interface TenuStats {
  totalEncaisse: number;
  totalAttendu: number;
  nbPayes: number;
  nbPartiels: number;
  nbNonPayes: number;
  totalReste: number;
}
