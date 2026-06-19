"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { AppSettings } from "@/lib/types";

export async function updateAppSettings(data: Partial<Omit<AppSettings, "id" | "updated_at">>) {
  await requirePermission("manageSettings");
  const supabase = await createClient();

  const { error } = await supabase
    .from("app_settings")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) return { error: error.message };

  await logAudit("modif_parametres", "app_settings", null, { changements: data });
  revalidatePath("/", "layout");
  return { success: true };
}

export async function uploadLogo(formData: FormData) {
  await requirePermission("manageSettings");
  const supabase = await createClient();
  const file = formData.get("logo") as File | null;
  if (!file) return { error: "Aucun fichier sélectionné" };

  const ext = file.name.split(".").pop() ?? "png";
  const path = `logo-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("branding")
    .upload(path, file, { upsert: true });

  if (uploadError) return { error: uploadError.message };

  const { data: { publicUrl } } = supabase.storage.from("branding").getPublicUrl(path);
  return updateAppSettings({ logo_url: publicUrl });
}
