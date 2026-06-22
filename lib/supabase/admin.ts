import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY manquant dans les variables d'environnement");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function hasAdminClient(): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return !!key && key.length > 20;
}

export const SERVICE_ROLE_MSG =
  "La clé SUPABASE_SERVICE_ROLE_KEY est requise. Ajoutez-la dans .env.local (Supabase → Project Settings → API → service_role), puis redémarrez le serveur.";

export function getAdminClientSafe():
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
