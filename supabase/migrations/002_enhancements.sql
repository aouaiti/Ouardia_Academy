-- Migration 002 — Inscription mois/année, paramètres app, audit purge, storage logo

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS mois_inscription int,
  ADD COLUMN IF NOT EXISTS annee_inscription int;

UPDATE public.players
SET
  mois_inscription = COALESCE(mois_inscription, EXTRACT(MONTH FROM date_inscription::date)::int),
  annee_inscription = COALESCE(annee_inscription, EXTRACT(YEAR FROM date_inscription::date)::int)
WHERE mois_inscription IS NULL OR annee_inscription IS NULL;

ALTER TABLE public.players
  ALTER COLUMN mois_inscription SET NOT NULL,
  ALTER COLUMN annee_inscription SET NOT NULL;

ALTER TABLE public.players
  ADD CONSTRAINT players_mois_inscription_check CHECK (mois_inscription >= 1 AND mois_inscription <= 12);

CREATE TABLE IF NOT EXISTS public.app_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  app_name text NOT NULL DEFAULT 'Académie de Football',
  app_description text NOT NULL DEFAULT 'Encaissement',
  logo_url text,
  primary_color text NOT NULL DEFAULT '#166534',
  primary_dark text NOT NULL DEFAULT '#14532d',
  primary_light text NOT NULL DEFAULT '#22c55e',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lecture_app_settings" ON public.app_settings FOR SELECT USING (public.is_active_user());
CREATE POLICY "update_app_settings" ON public.app_settings FOR UPDATE USING (public.is_admin());
CREATE POLICY "insert_app_settings" ON public.app_settings FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "delete_audit_log" ON public.audit_log FOR DELETE USING (public.is_admin());

-- Bucket pour le logo (public en lecture)
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "lecture_branding" ON storage.objects FOR SELECT
  USING (bucket_id = 'branding');

CREATE POLICY "upload_branding" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'branding' AND public.is_admin());

CREATE POLICY "update_branding" ON storage.objects FOR UPDATE
  USING (bucket_id = 'branding' AND public.is_admin());

CREATE POLICY "delete_branding" ON storage.objects FOR DELETE
  USING (bucket_id = 'branding' AND public.is_admin());
