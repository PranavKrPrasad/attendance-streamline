import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { StatCard } from "./stat-card";
import { CalendarCheck, TrendingUp, BookOpen, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function StudentDashboard() {
  const { data: me } = useCurrentUser();
  const { data } = useQuery({
    queryKey: ["student-stats", me?.user.id],
    enabled: !!me?.user.id,
    queryFn: async () => {
      const { data: recs } = await supabase
        .from("attendance_records")
        .select("status, class_id, classes(name, low_attendance_threshold)")
        .eq("student_id", me!.user.id);
      const all = recs ?? [];
      const bySubject: Record<string, { name: string; total: number; present: number; threshold: number }> = {};
      all.forEach((r: any) => {
        const cn = r.classes?.name ?? "Unknown";
        bySubject[r.class_id] ??= { name: cn, total: 0, present: 0, threshold: r.classes?.low_attendance_threshold ?? 75 };
        bySubject[r.class_id].total++;
        if (r.status === "present" || r.status === "late") bySubject[r.class_id].present++;
      });
      const total = all.length;
      const present = all.filter((r: any) => r.status === "present" || r.status === "late").length;
      const overall = total ? Math.round((present / total) * 100) : 0;
      const subjects = Object.values(bySubject).map(s => ({ ...s, pct: s.total ? Math.round((s.present / s.total) * 100) : 0 }));
      return { overall, total, present, subjects, low: subjects.filter(s => s.pct < s.threshold) };
    },
  });

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Hi, {me?.profile?.full_name?.split(" ")[0] ?? "Student"}</h1></div>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={TrendingUp} label="Overall attendance" value={`${data?.overall ?? 0}%`} tone={(data?.overall ?? 100) < 75 ? "warn" : "success"} />
        <StatCard icon={CalendarCheck} label="Classes attended" value={data?.present ?? 0} />
        <StatCard icon={BookOpen} label="Subjects" value={data?.subjects.length ?? 0} />
        <StatCard icon={AlertTriangle} label="Low attendance" value={data?.low.length ?? 0} tone={data?.low.length ? "warn" : "default"} />
      </div>
      <div className="glass-card rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Subject-wise attendance</h2>
        {data?.subjects.length ? (
          <div className="space-y-3">
            {data.subjects.map(s => (
              <div key={s.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{s.name}</span>
                  <span className={s.pct < s.threshold ? "text-destructive font-semibold" : ""}>{s.pct}% ({s.present}/{s.total})</span>
                </div>
                <Progress value={s.pct} className={s.pct < s.threshold ? "[&>div]:bg-destructive" : ""} />
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground">No attendance records yet.</p>}
      </div>
    </div>
  );
}
