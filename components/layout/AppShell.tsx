import Link from "next/link";
import Image from "next/image";
import { signOut } from "@/app/actions/users";
import { hasPermission, hasAnyPermission } from "@/lib/permissions";
import { roleLabel } from "@/lib/permissions";
import type { AppUser, AppSettings } from "@/lib/types";
import type { PERMISSIONS } from "@/lib/permissions";
import {
  LayoutDashboard,
  CreditCard,
  Users,
  Shield,
  UserCog,
  ClipboardList,
  LogOut,
  Trophy,
  Palette,
} from "lucide-react";

type Permission = keyof typeof PERMISSIONS;

const navItems: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: Permission;
  anyPermission?: Permission[];
  optional?: boolean;
}[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, permission: "viewDashboard" },
  { href: "/paiement", label: "Paiement", icon: CreditCard, permission: "recordPayment", optional: true },
  { href: "/utilisateurs", label: "Utilisateurs", icon: Users, permission: "manageUsers" },
  { href: "/admin/joueurs", label: "Joueurs", icon: UserCog, anyPermission: ["managePlayers", "addPlayers"] },
  { href: "/admin/entraineurs", label: "Entraîneurs", icon: Shield, anyPermission: ["manageTrainers", "addTrainers"] },
  { href: "/admin/journal", label: "Journal d'audit", icon: ClipboardList, permission: "viewAuditLog" },
  { href: "/admin/parametres", label: "Paramètres", icon: Palette, permission: "manageSettings" },
];

export function AppShell({
  user,
  settings,
  children,
}: {
  user: AppUser;
  settings: AppSettings;
  children: React.ReactNode;
}) {
  const visibleNav = navItems.filter((item) => {
    if (item.anyPermission) {
      return hasAnyPermission(user.role, item.anyPermission);
    }
    if (item.optional && item.permission && !hasPermission(user.role, item.permission)) return false;
    if (!item.optional && item.permission && item.permission !== "viewDashboard" && !hasPermission(user.role, item.permission)) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex min-h-screen">
      <aside
        className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-white/10 text-white"
        style={{ backgroundColor: settings.primary_dark }}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <div
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl"
            style={{ backgroundColor: `${settings.primary_light}33` }}
          >
            {settings.logo_url ? (
              <Image src={settings.logo_url} alt="Logo" width={40} height={40} className="object-contain" unoptimized />
            ) : (
              <Trophy className="h-5 w-5" style={{ color: settings.primary_light }} />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{settings.app_name}</p>
            <p className="text-xs text-white/60">{settings.app_description}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 px-2">
            <p className="text-sm font-medium">{user.prenom} {user.nom}</p>
            <p className="text-xs text-white/60">{roleLabel(user.role)}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </button>
          </form>
        </div>
      </aside>

      <main className="ml-64 flex-1">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
