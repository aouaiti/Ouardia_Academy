import type { AppSettings } from "@/lib/types";

export function logoUrlWithCacheBust(settings: AppSettings): string | null {
  if (!settings.logo_url) return null;
  const sep = settings.logo_url.includes("?") ? "&" : "?";
  return `${settings.logo_url}${sep}v=${encodeURIComponent(settings.updated_at)}`;
}
