"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Loader2, ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import type { AppSettings } from "@/lib/types";

export function ForgotPasswordForm({ settings }: { settings: AppSettings }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/login`,
    });

    setLoading(false);
    if (resetError) {
      setError("Une erreur est survenue. Vérifiez l'adresse email.");
      return;
    }
    setMessage("Un email de réinitialisation a été envoyé si le compte existe.");
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: `linear-gradient(to bottom right, ${settings.primary_dark}, ${settings.primary_color}, ${settings.primary_light}4d)` }}
    >
      <div className="w-full max-w-md rounded-2xl bg-surface p-8 shadow-xl">
        <div className="mb-8 text-center">
          <BrandLogo settings={settings} size="lg" className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Mot de passe oublié</h1>
          <p className="mt-1 text-sm text-muted">{settings.app_description}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              required
              className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          {message && <p className="text-sm text-success">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-white transition disabled:opacity-50"
            style={{ backgroundColor: settings.primary_color }}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Envoyer le lien
          </button>
        </form>

        <p className="mt-4 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-sm hover:underline"
            style={{ color: settings.primary_color }}
          >
            <ArrowLeft className="h-3 w-3" /> Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
