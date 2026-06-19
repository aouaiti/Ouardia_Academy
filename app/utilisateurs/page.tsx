import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { UsersClient } from "@/components/admin/UsersClient";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { fetchUsersWithEmails } from "@/app/actions/users";
import { redirect } from "next/navigation";

export default async function UtilisateursPage() {
  const session = await getSessionUser();
  if (!session || !hasPermission(session.profile.role, "manageUsers")) {
    redirect("/dashboard");
  }

  const { users, emails, emailConfirmed, serviceRoleConfigured } = await fetchUsersWithEmails();

  return (
    <AuthenticatedLayout>
      <UsersClient
        users={users}
        emails={emails}
        emailConfirmed={emailConfirmed}
        serviceRoleConfigured={serviceRoleConfigured}
      />
    </AuthenticatedLayout>
  );
}
