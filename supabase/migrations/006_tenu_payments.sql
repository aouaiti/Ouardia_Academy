-- Migration 006 — Paiements tenu (tenue sportive, unique par joueur, paiements partiels)

CREATE TABLE public.player_tenu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL UNIQUE REFERENCES public.players(id) ON DELETE CASCADE,
  prix numeric NOT NULL DEFAULT 60 CHECK (prix > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tenu_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  montant numeric NOT NULL CHECK (montant > 0),
  date_paiement timestamptz NOT NULL DEFAULT now(),
  enregistre_par uuid NOT NULL REFERENCES public.app_users(id),
  numero_recu text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_player_tenu_player_id ON public.player_tenu(player_id);
CREATE INDEX idx_tenu_payments_player_id ON public.tenu_payments(player_id);
CREATE INDEX idx_tenu_payments_date ON public.tenu_payments(date_paiement);

-- Créer une tenu pour les joueurs existants
INSERT INTO public.player_tenu (player_id, prix)
SELECT id, 60 FROM public.players
ON CONFLICT (player_id) DO NOTHING;

-- Auto-créer une tenu à l'ajout d'un joueur
CREATE OR REPLACE FUNCTION public.create_player_tenu()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.player_tenu (player_id, prix) VALUES (NEW.id, 60)
  ON CONFLICT (player_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_player_tenu
  AFTER INSERT ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.create_player_tenu();

ALTER TABLE public.player_tenu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenu_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lecture_player_tenu" ON public.player_tenu FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "update_player_tenu" ON public.player_tenu FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "insert_player_tenu" ON public.player_tenu FOR INSERT
  WITH CHECK (public.is_admin() OR public.is_editor_or_admin());

CREATE POLICY "lecture_tenu_payments" ON public.tenu_payments FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "insert_tenu_payments" ON public.tenu_payments FOR INSERT
  WITH CHECK (public.is_editor_or_admin());

CREATE POLICY "delete_tenu_payments" ON public.tenu_payments FOR DELETE
  USING (public.is_admin());
