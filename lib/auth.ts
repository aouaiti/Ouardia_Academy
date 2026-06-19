import { createClient } from "@/lib/supabase/server";
import type { AppUser, UserRole } from "@/lib/types";
import { hasPermission, type PERMISSIONS } from "@/lib/permissions";

export async function getSessionUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("app_users")
    .select("*")
    .eq("id", user.id)
    .eq("actif", true)
    .single();

  if (!profile) return null;
  return { authUser: user, profile: profile as AppUser };
}

export async function requireAuth() {
  const session = await getSessionUser();
  if (!session) throw new Error("Non authentifié");
  return session;
}

export async function requirePermission(permission: keyof typeof PERMISSIONS) {
  const session = await requireAuth();
  if (!hasPermission(session.profile.role, permission)) {
    throw new Error("Permission refusée");
  }
  return session;
}

export async function requireRole(roles: UserRole[]) {
  const session = await requireAuth();
  if (!roles.includes(session.profile.role)) {
    throw new Error("Permission refusée");
  }
  return session;
}
