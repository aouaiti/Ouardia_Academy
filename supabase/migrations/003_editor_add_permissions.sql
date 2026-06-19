-- Migration 003 — Éditeurs peuvent ajouter joueurs et entraîneurs

DROP POLICY IF EXISTS "insert_players" ON public.players;
CREATE POLICY "insert_players" ON public.players FOR INSERT
  WITH CHECK (public.is_editor_or_admin());

DROP POLICY IF EXISTS "insert_trainers" ON public.trainers;
CREATE POLICY "insert_trainers" ON public.trainers FOR INSERT
  WITH CHECK (public.is_editor_or_admin());
