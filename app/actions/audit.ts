"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function purgeAuditLogs(monthsToKeep: 3 | 6 | 9 | 12) {
  await requirePermission("purgeAuditLog");
  const supabase = await createClient();

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsToKeep);
  const cutoffIso = cutoff.toISOString();

  const { data: toDelete, error: countError } = await supabase
    .from("audit_log")
    .select("id")
    .lt("created_at", cutoffIso);

  if (countError) return { error: countError.message };

  const { error } = await supabase.from("audit_log").delete().lt("created_at", cutoffIso);
  if (error) return { error: error.message };

  await logAudit("purge_audit_log", "audit_log", null, {
    months_to_keep: monthsToKeep,
    deleted_count: toDelete?.length ?? 0,
    cutoff: cutoffIso,
  });

  revalidatePath("/admin/journal");
  return { success: true, deleted: toDelete?.length ?? 0 };
}
