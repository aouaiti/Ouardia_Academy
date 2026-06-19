# Encaissement — Académie de Football

Application web de gestion des paiements mensuels des joueurs, conforme au cahier des charges.

## Stack

- **Next.js 16** (App Router)
- **Supabase** (Auth, Postgres, RLS)
- **Tailwind CSS 4**
- Interface 100 % en français

## Démarrage

### 1. Variables d'environnement

Le fichier `.env.local` contient déjà les clés Supabase du PRD.

### 2. Base de données

Exécutez les scripts SQL dans Supabase (éditeur SQL), dans l'ordre :

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_enhancements.sql
```

Le script `002` ajoute : mois/année d'inscription, paramètres de personnalisation, purge du journal d'audit, bucket logo.

### 3. Premier administrateur

1. Créez un utilisateur dans **Supabase Auth** (email + mot de passe)
2. Insérez son profil :

```sql
INSERT INTO public.app_users (id, nom, prenom, role)
VALUES ('<uuid-de-auth-users>', 'Admin', 'Principal', 'admin');
```

### 4. Lancer l'application

```bash
npm install
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000)

## Pages

| Route | Accès | Description |
|---|---|---|
| `/login` | Public | Connexion |
| `/forgot-password` | Public | Réinitialisation mot de passe |
| `/dashboard` | Tous | Tableau de bord, filtres, exports PDF/CSV |
| `/paiement` | Éditeur, Admin | Enregistrement paiements et reçus |
| `/utilisateurs` | Admin | Gestion des comptes |
| `/admin/joueurs` | Admin | Gestion joueurs + réaffectation masse |
| `/admin/entraineurs` | Admin | Gestion entraîneurs |
| `/admin/journal` | Admin | Journal d'audit + purge (3/6/9/12 mois) |
| `/admin/parametres` | Admin | Logo, nom, description, couleurs |

### Variables optionnelles

Ajoutez dans `.env.local` pour réinitialiser les mots de passe des autres utilisateurs :

```
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role
```

## Rôles

- **Utilisateur** : consultation + exports
- **Éditeur** : + enregistrement paiements et reçus
- **Admin** : accès complet (suppression, gestion, audit)

Les permissions sont appliquées côté UI, serveur (Server Actions) et base (RLS Supabase).
