import { createClient } from "@/lib/supabase/server";

export async function logAudit(
  action: string,
  tableCible?: string,
  idCible?: string | null,
  details?: Record<string, unknown>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("audit_log").insert({
    user_id: user.id,
    action,
    table_cible: tableCible ?? null,
    id_cible: idCible ?? null,
    details: details ?? null,
  });
}
