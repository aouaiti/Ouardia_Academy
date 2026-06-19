-- Schéma initial — Application d'encaissement Académie de football
-- Exécuter dans l'éditeur SQL Supabase

CREATE TYPE public.user_role AS ENUM ('admin', 'editor', 'user');
CREATE TYPE public.player_status AS ENUM ('actif', 'inactif');

CREATE TABLE public.app_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom text NOT NULL,
  prenom text NOT NULL,
  role public.user_role NOT NULL DEFAULT 'user',
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.trainers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  prenom text NOT NULL,
  telephone text,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  prenom text NOT NULL,
  annee_naissance int NOT NULL,
  entraineur_id uuid REFERENCES public.trainers(id),
  telephone text,
  tarif_mensuel numeric NOT NULL DEFAULT 40,
  statut public.player_status NOT NULL DEFAULT 'actif',
  date_inscription date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_players_nom ON public.players(nom);
CREATE INDEX idx_players_annee_naissance ON public.players(annee_naissance);
CREATE INDEX idx_players_entraineur_id ON public.players(entraineur_id);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id),
  mois int NOT NULL CHECK (mois >= 1 AND mois <= 12),
  annee int NOT NULL,
  montant numeric NOT NULL,
  date_paiement timestamptz NOT NULL DEFAULT now(),
  enregistre_par uuid NOT NULL REFERENCES public.app_users(id),
  numero_recu text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, mois, annee)
);

CREATE INDEX idx_payments_player_period ON public.payments(player_id, annee, mois);

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users(id),
  action text NOT NULL,
  table_cible text,
  id_cible uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.filter_shortcuts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  nom text NOT NULL,
  filtres jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.app_users WHERE id = auth.uid() AND actif = true; $$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin' AND actif = true); $$;

CREATE OR REPLACE FUNCTION public.is_editor_or_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role IN ('editor', 'admin') AND actif = true); $$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND actif = true); $$;

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filter_shortcuts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lecture_app_users" ON public.app_users FOR SELECT USING (public.is_active_user());
CREATE POLICY "insert_app_users" ON public.app_users FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "update_app_users" ON public.app_users FOR UPDATE USING (public.is_admin());

CREATE POLICY "lecture_trainers" ON public.trainers FOR SELECT USING (public.is_active_user());
CREATE POLICY "insert_trainers" ON public.trainers FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "update_trainers" ON public.trainers FOR UPDATE USING (public.is_admin());

CREATE POLICY "lecture_players" ON public.players FOR SELECT USING (public.is_active_user());
CREATE POLICY "insert_players" ON public.players FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "update_players" ON public.players FOR UPDATE USING (public.is_admin());

CREATE POLICY "lecture_payments" ON public.payments FOR SELECT USING (public.is_active_user());
CREATE POLICY "insert_payments" ON public.payments FOR INSERT WITH CHECK (public.is_editor_or_admin());
CREATE POLICY "delete_payments" ON public.payments FOR DELETE USING (public.is_admin());
CREATE POLICY "update_payments" ON public.payments FOR UPDATE USING (public.is_admin());

CREATE POLICY "lecture_audit_log" ON public.audit_log FOR SELECT USING (public.is_admin());
CREATE POLICY "insert_audit_log" ON public.audit_log FOR INSERT WITH CHECK (public.is_active_user() AND user_id = auth.uid());

CREATE POLICY "gestion_shortcuts" ON public.filter_shortcuts FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Premier admin : créer l'utilisateur dans Auth, puis exécuter :
-- INSERT INTO public.app_users (id, nom, prenom, role) VALUES ('<uuid-auth>', 'Admin', 'Principal', 'admin');
