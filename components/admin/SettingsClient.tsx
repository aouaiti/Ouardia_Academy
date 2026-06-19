"use client";

import { useState, useTransition } from "react";
import { updateAppSettings, uploadLogo } from "@/app/actions/settings";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { AppSettings } from "@/lib/types";
import { Loader2, Save } from "lucide-react";
import Image from "next/image";

export function SettingsClient({ settings }: { settings: AppSettings }) {
  const [form, setForm] = useState(settings);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function handleSave() {
    setMessage("");
    startTransition(async () => {
      const result = await updateAppSettings({
        app_name: form.app_name,
        app_description: form.app_description,
        primary_color: form.primary_color,
        primary_dark: form.primary_dark,
        primary_light: form.primary_light,
        logo_url: form.logo_url,
      });
      if (result.error) setMessage(result.error);
      else setMessage("Paramètres enregistrés");
    });
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("logo", file);
    startTransition(async () => {
      const result = await uploadLogo(fd);
      if (result.error) setMessage(result.error);
      else setMessage("Logo mis à jour");
    });
  }

  return (
    <>
      <PageHeader title="Paramètres de l'application" description="Personnalisation du nom, logo et couleurs" />

      <Card className="mb-6">
        <h2 className="mb-4 font-semibold">Identité</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Nom de l&apos;application</label>
            <input className="w-full rounded-lg border border-border px-3 py-2 text-sm" value={form.app_name} onChange={(e) => setForm({ ...form, app_name: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <input className="w-full rounded-lg border border-border px-3 py-2 text-sm" value={form.app_description} onChange={(e) => setForm({ ...form, app_description: e.target.value })} />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium">Logo</label>
          <div className="flex items-center gap-4">
            {form.logo_url ? (
              <Image src={form.logo_url} alt="Logo" width={48} height={48} className="rounded-lg object-contain" unoptimized />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-xs text-muted">Aucun</div>
            )}
            <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm" />
          </div>
        </div>
      </Card>

      <Card className="mb-6">
        <h2 className="mb-4 font-semibold">Couleurs</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Couleur principale</label>
            <input type="color" className="h-10 w-full cursor-pointer rounded border border-border" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Couleur foncée (sidebar)</label>
            <input type="color" className="h-10 w-full cursor-pointer rounded border border-border" value={form.primary_dark} onChange={(e) => setForm({ ...form, primary_dark: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Couleur claire (accents)</label>
            <input type="color" className="h-10 w-full cursor-pointer rounded border border-border" value={form.primary_light} onChange={(e) => setForm({ ...form, primary_light: e.target.value })} />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <div className="h-8 flex-1 rounded" style={{ background: form.primary_color }} />
          <div className="h-8 flex-1 rounded" style={{ background: form.primary_dark }} />
          <div className="h-8 flex-1 rounded" style={{ background: form.primary_light }} />
        </div>
      </Card>

      {message && <p className="mb-4 text-sm text-muted">{message}</p>}

      <Button variant="primary" disabled={pending} onClick={handleSave}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Enregistrer les paramètres
      </Button>
    </>
  );
}
