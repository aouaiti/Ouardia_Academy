import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { AuditLogClient } from "@/components/admin/AuditLogClient";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { fetchAuditLog, fetchAuditFilterOptions } from "@/lib/data/audit";
import { redirect } from "next/navigation";
import type { AuditLogEntry, AuditLogFilters } from "@/lib/types";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function JournalPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getSessionUser();
  if (!session || !hasPermission(session.profile.role, "viewAuditLog")) {
    redirect("/dashboard");
  }

  const filters: AuditLogFilters = {
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    action: params.action,
    userId: params.userId,
    tableCible: params.tableCible,
    search: params.search,
  };

  const [{ entries }, filterOptions] = await Promise.all([
    fetchAuditLog(filters),
    fetchAuditFilterOptions(),
  ]);

  return (
    <AuthenticatedLayout>
      <AuditLogClient
        entries={(entries ?? []) as AuditLogEntry[]}
        filters={filters}
        filterOptions={filterOptions}
      />
    </AuthenticatedLayout>
  );
}
