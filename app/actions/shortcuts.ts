"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import type { DashboardFilters } from "@/lib/types";

export async function saveFilterShortcut(nom: string, filtres: DashboardFilters) {
  const { profile } = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.from("filter_shortcuts").insert({
    user_id: profile.id,
    nom,
    filtres,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteFilterShortcut(id: string) {
  const { profile } = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase
    .from("filter_shortcuts")
    .delete()
    .eq("id", id)
    .eq("user_id", profile.id);

  if (error) return { error: error.message };
  return { success: true };
}
