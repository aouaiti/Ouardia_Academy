-- Migration 005 — Autoriser suppression admins pour joueurs/entraîneurs

DROP POLICY IF EXISTS "delete_players" ON public.players;
CREATE POLICY "delete_players" ON public.players FOR DELETE
  USING (public.is_admin());

DROP POLICY IF EXISTS "delete_trainers" ON public.trainers;
CREATE POLICY "delete_trainers" ON public.trainers FOR DELETE
  USING (public.is_admin());
