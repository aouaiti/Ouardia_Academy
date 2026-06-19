"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { requireAuth, requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/types";

const SERVICE_ROLE_MSG =
  "La clé SUPABASE_SERVICE_ROLE_KEY est requise. Ajoutez-la dans .env.local (Supabase → Project Settings → API → service_role), puis redémarrez le serveur.";

function getAdminClientSafe():
  | { admin: ReturnType<typeof createAdminClient> }
  | { error: string } {
  if (!hasAdminClient()) {
    return { error: SERVICE_ROLE_MSG };
  }
  try {
    return { admin: createAdminClient() };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Clé service role invalide" };
  }
}

export async function isServiceRoleConfigured(): Promise<boolean> {
  return hasAdminClient();
}

export async function createAppUser(data: {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  role: UserRole;
}) {
  try {
    await requirePermission("manageUsers");

    if (!data.email?.trim() || !data.password || !data.nom?.trim() || !data.prenom?.trim()) {
      return { error: "Tous les champs sont obligatoires" };
    }
    if (data.password.length < 6) {
      return { error: "Le mot de passe doit contenir au moins 6 caractères" };
    }

    const adminResult = getAdminClientSafe();
    if ("error" in adminResult) return { error: adminResult.error };

    const { data: authData, error: authError } = await adminResult.admin.auth.admin.createUser({
      email: data.email.trim(),
      password: data.password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      return { error: authError?.message ?? "Erreur lors de la création du compte Auth" };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("app_users").insert({
      id: authData.user.id,
      nom: data.nom.trim(),
      prenom: data.prenom.trim(),
      role: data.role,
    });

    if (error) {
      await adminResult.admin.auth.admin.deleteUser(authData.user.id);
      return { error: error.message };
    }

    await logAudit("ajout_utilisateur", "app_users", authData.user.id, {
      email: data.email,
      role: data.role,
    });
    revalidatePath("/utilisateurs");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inattendue lors de la création" };
  }
}

export async function updateAppUser(
  id: string,
  data: Partial<{ nom: string; prenom: string; role: UserRole; actif: boolean }>
) {
  try {
    await requirePermission("manageUsers");
    const supabase = await createClient();

    const { data: before } = await supabase.from("app_users").select("*").eq("id", id).single();
    const { error } = await supabase.from("app_users").update(data).eq("id", id);
    if (error) return { error: error.message };

    await logAudit("modif_utilisateur", "app_users", id, { avant: before, apres: data });
    revalidatePath("/utilisateurs");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inattendue" };
  }
}

export async function resetUserPassword(userId: string, newPassword: string) {
  try {
    await requirePermission("manageUsers");

    if (newPassword.length < 6) {
      return { error: "Le mot de passe doit contenir au moins 6 caractères" };
    }

    const adminResult = getAdminClientSafe();
    if ("error" in adminResult) return { error: adminResult.error };

    const { error } = await adminResult.admin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (error) return { error: error.message };

    await logAudit("reset_mot_de_passe", "app_users", userId, {});
    revalidatePath("/utilisateurs");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur lors de la réinitialisation" };
  }
}

export async function sendUserPasswordResetEmail(userId: string) {
  try {
    await requirePermission("manageUsers");

    const adminResult = getAdminClientSafe();
    if ("error" in adminResult) return { error: adminResult.error };

    const { data: userData, error: fetchError } =
      await adminResult.admin.auth.admin.getUserById(userId);
    if (fetchError || !userData.user?.email) {
      return { error: "Impossible de récupérer l'email de l'utilisateur" };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const { error } = await adminResult.admin.auth.resetPasswordForEmail(
      userData.user.email,
      { redirectTo: `${siteUrl}/auth/callback?next=/login` }
    );
    if (error) return { error: error.message };

    await logAudit("envoi_reset_mot_de_passe", "app_users", userId, {
      email: userData.user.email,
    });
    return { success: true, email: userData.user.email };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur lors de l'envoi" };
  }
}

export async function updateOwnPassword(newPassword: string) {
  try {
    const { authUser } = await requireAuth();
    if (newPassword.length < 6) {
      return { error: "Le mot de passe doit contenir au moins 6 caractères" };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };

    await logAudit("modif_mot_de_passe", "app_users", authUser.id, {});
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur lors du changement de mot de passe" };
  }
}

export async function deactivateAppUser(id: string) {
  return updateAppUser(id, { actif: false });
}

export async function updateAppUserEmail(userId: string, email: string) {
  try {
    await requirePermission("manageUsers");
    const trimmed = email.trim();
    if (!trimmed) return { error: "Email obligatoire" };

    const adminResult = getAdminClientSafe();
    if ("error" in adminResult) return { error: adminResult.error };

    const { error } = await adminResult.admin.auth.admin.updateUserById(userId, {
      email: trimmed,
      email_confirm: true,
    });
    if (error) return { error: error.message };

    await logAudit("modif_email_utilisateur", "app_users", userId, { email: trimmed });
    revalidatePath("/utilisateurs");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur lors de la modification de l'email" };
  }
}

export async function confirmAuthUser(userId: string) {
  try {
    await requirePermission("manageUsers");
    const adminResult = getAdminClientSafe();
    if ("error" in adminResult) return { error: adminResult.error };

    const { error } = await adminResult.admin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });
    if (error) return { error: error.message };

    await logAudit("confirmation_email_utilisateur", "app_users", userId, {});
    revalidatePath("/utilisateurs");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur lors de la confirmation" };
  }
}

export async function fetchUsersWithEmails() {
  await requirePermission("manageUsers");
  const supabase = await createClient();
  const { data: users } = await supabase.from("app_users").select("*").order("nom");

  const emails: Record<string, string> = {};
  const emailConfirmed: Record<string, boolean> = {};

  const adminResult = getAdminClientSafe();
  if (!("error" in adminResult)) {
    const { data: authData } = await adminResult.admin.auth.admin.listUsers({ perPage: 1000 });
    for (const authUser of authData.users ?? []) {
      if (authUser.email) emails[authUser.id] = authUser.email;
      emailConfirmed[authUser.id] = !!authUser.email_confirmed_at;
    }
  }

  return {
    users: users ?? [],
    emails,
    emailConfirmed,
    serviceRoleConfigured: !("error" in adminResult),
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
