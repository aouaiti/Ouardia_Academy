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
