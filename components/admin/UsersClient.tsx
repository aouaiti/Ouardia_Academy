"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createAppUser,
  updateAppUser,
  updateAppUserEmail,
  resetUserPassword,
  sendUserPasswordResetEmail,
  updateOwnPassword,
  confirmAuthUser,
} from "@/app/actions/users";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { AppUser, UserRole } from "@/lib/types";
import { UserPlus, Loader2, KeyRound, Mail, AlertTriangle, CheckCircle } from "lucide-react";

interface EditState {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

export function UsersClient({
  users,
  emails,
  emailConfirmed,
  serviceRoleConfigured,
}: {
  users: AppUser[];
  emails: Record<string, string>;
  emailConfirmed: Record<string, boolean>;
  serviceRoleConfigured: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    email: "", password: "", nom: "", prenom: "", role: "user" as UserRole,
  });
  const [editUser, setEditUser] = useState<EditState | null>(null);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [ownPassword, setOwnPassword] = useState("");

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function openEdit(u: AppUser) {
    setEditUser({
      id: u.id,
      nom: u.nom,
      prenom: u.prenom,
      email: emails[u.id] ?? "",
    });
    clearMessages();
  }

  function handleCreate() {
    clearMessages();
    startTransition(async () => {
      const result = await createAppUser(form);
      if (result.error) setError(result.error);
      else {
        setShowForm(false);
        setForm({ email: "", password: "", nom: "", prenom: "", role: "user" });
        setSuccess("Utilisateur créé — connexion immédiate possible");
        router.refresh();
      }
    });
  }

  function handleSaveEdit() {
    if (!editUser) return;
    clearMessages();
    startTransition(async () => {
      const profileResult = await updateAppUser(editUser.id, {
        nom: editUser.nom,
        prenom: editUser.prenom,
      });
      if (profileResult.error) {
        setError(profileResult.error);
        return;
      }

      const currentEmail = emails[editUser.id] ?? "";
      if (editUser.email.trim() && editUser.email.trim() !== currentEmail) {
        const emailResult = await updateAppUserEmail(editUser.id, editUser.email);
        if (emailResult.error) {
          setError(emailResult.error);
          return;
        }
      }

      setEditUser(null);
      setSuccess("Utilisateur mis à jour");
      router.refresh();
    });
  }

  function handleToggleActive(user: AppUser) {
    if (!confirm(user.actif ? "Désactiver ce compte ?" : "Réactiver ce compte ?")) return;
    clearMessages();
    startTransition(async () => {
      const result = await updateAppUser(user.id, { actif: !user.actif });
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleRoleChange(id: string, role: UserRole) {
    clearMessages();
    startTransition(async () => {
      const result = await updateAppUser(id, { role });
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleResetPassword() {
    if (!resetUserId || !newPassword) return;
    clearMessages();
    startTransition(async () => {
      const result = await resetUserPassword(resetUserId, newPassword);
      if (result.error) setError(result.error);
      else {
        setResetUserId(null);
        setNewPassword("");
        setSuccess("Mot de passe réinitialisé");
      }
    });
  }

  function handleSendResetEmail(userId: string) {
    clearMessages();
    startTransition(async () => {
      const result = await sendUserPasswordResetEmail(userId);
      if (result.error) setError(result.error);
      else setSuccess(`Email de réinitialisation envoyé à ${result.email}`);
    });
  }

  function handleConfirmEmail(userId: string) {
    clearMessages();
    startTransition(async () => {
      const result = await confirmAuthUser(userId);
      if (result.error) setError(result.error);
      else {
        setSuccess("Email confirmé — l'utilisateur peut se connecter");
        router.refresh();
      }
    });
  }

  function handleOwnPassword() {
    if (!ownPassword) return;
    clearMessages();
    startTransition(async () => {
      const result = await updateOwnPassword(ownPassword);
      if (result.error) setError(result.error);
      else {
        setOwnPassword("");
        setSuccess("Votre mot de passe a été modifié");
      }
    });
  }

  return (
    <>
      <PageHeader
        title="Utilisateurs"
        description="Gestion complète des comptes (admin uniquement)"
        actions={
          <Button variant="primary" size="sm" onClick={() => { setShowForm(!showForm); clearMessages(); }}>
            <UserPlus className="h-4 w-4" /> Ajouter
          </Button>
        }
      />

      {!serviceRoleConfigured && (
        <Card className="mb-6 border-amber-300 bg-amber-50">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">
              <strong>SUPABASE_SERVICE_ROLE_KEY</strong> manquante dans .env.local — redémarrez le serveur après l&apos;avoir ajoutée.
            </p>
          </div>
        </Card>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">{error}</div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-success">{success}</div>
      )}

      <Card className="mb-6">
        <h2 className="mb-3 font-semibold">Mon mot de passe</h2>
        <div className="flex flex-wrap gap-3">
          <input type="password" placeholder="Nouveau mot de passe" className="rounded-lg border border-border px-3 py-2 text-sm" value={ownPassword} onChange={(e) => setOwnPassword(e.target.value)} />
          <Button variant="primary" size="sm" disabled={!ownPassword || pending} onClick={handleOwnPassword}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Modifier
          </Button>
        </div>
      </Card>

      {showForm && (
        <Card className="mb-6">
          <h2 className="mb-4 font-semibold">Nouvel utilisateur</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input placeholder="Prénom" className="rounded-lg border border-border px-3 py-2 text-sm" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
            <input placeholder="Nom" className="rounded-lg border border-border px-3 py-2 text-sm" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
            <input type="email" placeholder="Email" className="rounded-lg border border-border px-3 py-2 text-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input type="password" placeholder="Mot de passe (min. 6 car.)" className="rounded-lg border border-border px-3 py-2 text-sm" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <select className="rounded-lg border border-border px-3 py-2 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
              <option value="user">Utilisateur</option>
              <option value="editor">Éditeur</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          <Button variant="primary" className="mt-4" disabled={pending || !serviceRoleConfigured} onClick={handleCreate}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Créer
          </Button>
        </Card>
      )}

      {editUser && (
        <Card className="mb-6 border-primary/30">
          <h2 className="mb-3 font-semibold">Modifier l&apos;utilisateur</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input placeholder="Prénom" className="rounded-lg border border-border px-3 py-2 text-sm" value={editUser.prenom} onChange={(e) => setEditUser({ ...editUser, prenom: e.target.value })} />
            <input placeholder="Nom" className="rounded-lg border border-border px-3 py-2 text-sm" value={editUser.nom} onChange={(e) => setEditUser({ ...editUser, nom: e.target.value })} />
            <input type="email" placeholder="Email" className="rounded-lg border border-border px-3 py-2 text-sm sm:col-span-2" value={editUser.email} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} />
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="primary" size="sm" disabled={pending} onClick={handleSaveEdit}>Enregistrer</Button>
            <Button variant="ghost" size="sm" onClick={() => setEditUser(null)}>Annuler</Button>
          </div>
        </Card>
      )}

      {resetUserId && (
        <Card className="mb-6">
          <h2 className="mb-3 font-semibold">Réinitialiser le mot de passe — {emails[resetUserId] ?? "utilisateur"}</h2>
          <div className="flex flex-wrap gap-3">
            <input type="password" placeholder="Nouveau mot de passe" className="rounded-lg border border-border px-3 py-2 text-sm" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <Button variant="primary" size="sm" disabled={!newPassword || pending} onClick={handleResetPassword}>Définir</Button>
            <Button variant="outline" size="sm" disabled={pending} onClick={() => handleSendResetEmail(resetUserId)}>
              <Mail className="h-4 w-4" /> Lien par email
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setResetUserId(null); setNewPassword(""); }}>Annuler</Button>
          </div>
        </Card>
      )}

      <Card>
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-muted">Nom</th>
              <th className="px-3 py-2 text-left font-medium text-muted">Email</th>
              <th className="px-3 py-2 text-left font-medium text-muted">Rôle</th>
              <th className="px-3 py-2 text-left font-medium text-muted">Statut</th>
              <th className="px-3 py-2 text-right font-medium text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2">{u.prenom} {u.nom}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs">{emails[u.id] ?? "—"}</span>
                    {emails[u.id] && !emailConfirmed[u.id] && (
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs text-amber-600 hover:underline"
                        onClick={() => handleConfirmEmail(u.id)}
                      >
                        <CheckCircle className="h-3 w-3" /> Confirmer email
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <select className="rounded border border-border px-2 py-1 text-xs" value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}>
                    <option value="user">Utilisateur</option>
                    <option value="editor">Éditeur</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${u.actif ? "bg-green-100 text-success" : "bg-red-100 text-danger"}`}>
                    {u.actif ? "Actif" : "Inactif"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>Modifier</Button>
                    <Button variant="ghost" size="sm" onClick={() => { setResetUserId(u.id); clearMessages(); }} title="Mot de passe">
                      <KeyRound className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleToggleActive(u)}>
                      {u.actif ? "Désactiver" : "Réactiver"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
