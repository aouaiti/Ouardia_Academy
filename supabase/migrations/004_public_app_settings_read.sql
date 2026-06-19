-- Migration 004 — Lecture publique des paramètres de marque (écran de connexion)

DROP POLICY IF EXISTS "lecture_app_settings" ON public.app_settings;
CREATE POLICY "lecture_app_settings" ON public.app_settings FOR SELECT USING (true);
