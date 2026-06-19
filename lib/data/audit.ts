import { createClient } from "@/lib/supabase/server";
import type { AuditLogFilters } from "@/lib/types";

export async function fetchAuditLog(filters: AuditLogFilters) {
  const supabase = await createClient();

  let query = supabase
    .from("audit_log")
    .select("*, app_users(nom, prenom)")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (filters.action) query = query.eq("action", filters.action);
  if (filters.userId) query = query.eq("user_id", filters.userId);
  if (filters.tableCible) query = query.eq("table_cible", filters.tableCible);
  if (filters.dateFrom) query = query.gte("created_at", `${filters.dateFrom}T00:00:00`);
  if (filters.dateTo) query = query.lte("created_at", `${filters.dateTo}T23:59:59`);

  const { data, error } = await query;
  if (error) return { entries: [], error: error.message };

  let entries = data ?? [];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    entries = entries.filter((e) => {
      const details = e.details ? JSON.stringify(e.details).toLowerCase() : "";
      const action = e.action.toLowerCase();
      const table = (e.table_cible ?? "").toLowerCase();
      const user = e.app_users
        ? `${e.app_users.prenom} ${e.app_users.nom}`.toLowerCase()
        : "";
      return details.includes(q) || action.includes(q) || table.includes(q) || user.includes(q);
    });
  }

  return { entries, error: null };
}

export async function fetchAuditFilterOptions() {
  const supabase = await createClient();

  const [{ data: users }, { data: actions }, { data: tables }] = await Promise.all([
    supabase.from("app_users").select("id, nom, prenom").order("nom"),
    supabase.from("audit_log").select("action"),
    supabase.from("audit_log").select("table_cible"),
  ]);

  const uniqueActions = [...new Set((actions ?? []).map((a) => a.action))].sort();
  const uniqueTables = [...new Set((tables ?? []).map((t) => t.table_cible).filter(Boolean))].sort();

  return { users: users ?? [], actions: uniqueActions, tables: uniqueTables as string[] };
}
