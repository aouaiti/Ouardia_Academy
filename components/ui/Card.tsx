import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface p-5 shadow-sm", className)}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "red" | "blue";
}) {
  const accentClass = {
    green: "border-l-4 border-l-success",
    red: "border-l-4 border-l-danger",
    blue: "border-l-4 border-l-primary",
  }[accent ?? "blue"];

  return (
    <Card className={accentClass}>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </Card>
  );
}
