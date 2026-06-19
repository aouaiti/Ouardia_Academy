import type { UserRole } from "./types";

export const PERMISSIONS = {
  viewDashboard: ["admin", "editor", "user"] as UserRole[],
  exportReports: ["admin", "editor", "user"] as UserRole[],
  recordPayment: ["admin", "editor"] as UserRole[],
  generateReceipt: ["admin", "editor"] as UserRole[],
  deletePayment: ["admin"] as UserRole[],
  modifyPlayerRate: ["admin"] as UserRole[],
  managePlayers: ["admin"] as UserRole[],
  addPlayers: ["admin", "editor"] as UserRole[],
  manageTrainers: ["admin"] as UserRole[],
  addTrainers: ["admin", "editor"] as UserRole[],
  bulkReassignTrainer: ["admin"] as UserRole[],
  manageUsers: ["admin"] as UserRole[],
  viewAuditLog: ["admin"] as UserRole[],
  purgeAuditLog: ["admin"] as UserRole[],
  manageSettings: ["admin"] as UserRole[],
};

export function hasPermission(role: UserRole | null | undefined, permission: keyof typeof PERMISSIONS): boolean {
  if (!role) return false;
  return PERMISSIONS[permission].includes(role);
}

export function hasAnyPermission(
  role: UserRole | null | undefined,
  permissions: (keyof typeof PERMISSIONS)[]
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function roleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin: "Administrateur",
    editor: "Éditeur",
    user: "Utilisateur",
  };
  return labels[role];
}
