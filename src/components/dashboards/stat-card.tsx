import type { LucideIcon } from "lucide-react";

export function StatCard({ icon: Icon, label, value, tone = "default" }: {
  icon: LucideIcon; label: string; value: number | string; tone?: "default" | "warn" | "success";
}) {
  const toneClass = tone === "warn" ? "from-destructive/20 to-warning/20 text-destructive"
    : tone === "success" ? "from-success/20 to-primary/20 text-success"
    : "gradient-primary text-primary-foreground";
  return (
    <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${tone === "default" ? "gradient-primary text-primary-foreground" : `bg-gradient-to-br ${toneClass}`}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
