import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, ListChecks, BarChart3, Zap, ShieldCheck, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Feature({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="glass-card rounded-2xl p-6 transition-transform hover:scale-[1.02]">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl gradient-primary text-primary-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-semibold text-lg">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-bold text-lg">
          <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span>ClassPulse</span>
        </div>
        <div className="flex gap-2">
          <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
          <Link to="/auth"><Button className="gradient-primary text-primary-foreground border-0">Get started</Button></Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-12 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium mb-6">
          <Zap className="h-3.5 w-3.5" /> Queue-based smart roll call
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          Attendance that <span className="text-gradient">actually flows</span>.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
          Start a session, watch students stream through the live queue, and get instant analytics
          with automatic low-attendance alerts.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link to="/auth"><Button size="lg" className="gradient-primary text-primary-foreground border-0 glow">Start free</Button></Link>
          <Link to="/auth"><Button size="lg" variant="outline">Teacher demo</Button></Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 grid gap-5 md:grid-cols-3">
        <Feature icon={ListChecks} title="Queue roll call" desc="Enqueue students, mark them one by one with a satisfying animated flow." />
        <Feature icon={BarChart3} title="Live analytics" desc="Daily, weekly, and semester percentages by subject, class, and department." />
        <Feature icon={Bell} title="Low-attendance alerts" desc="Configurable threshold. Auto-highlights students below the line." />
        <Feature icon={ShieldCheck} title="Role-based access" desc="Admin, teacher, and student dashboards secured with row-level policies." />
        <Feature icon={Zap} title="CSV export" desc="Export any class report in one click for offline records." />
        <Feature icon={GraduationCap} title="Multi-department" desc="Manage departments, subjects, and classes from one clean admin panel." />
      </section>

      <footer className="border-t border-border/50 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} ClassPulse
      </footer>
    </div>
  );
}
