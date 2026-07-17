import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { StatCard } from "./stat-card";
import { ClipboardList, Users, CalendarCheck, AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function TeacherDashboard() {
  const { data: me } = useCurrentUser();
  const { data } = useQuery({
    queryKey: ["teacher-stats", me?.user.id],
    enabled: !!me?.user.id,
    queryFn: async () => {
      const { data: classes } = await supabase.from("classes").select("id, name, section").eq("teacher_id", me!.user.id);
      const classIds = (classes ?? []).map(c => c.id);
      const [enroll, todayRec] = await Promise.all([
        classIds.length ? supabase.from("class_enrollments").select("student_id", { count: "exact", head: true }).in("class_id", classIds) : Promise.resolve({ count: 0 } as any),
        classIds.length ? supabase.from("attendance_records").select("status").in("class_id", classIds).gte("marked_at", new Date().toISOString().slice(0, 10)) : Promise.resolve({ data: [] } as any),
      ]);
      const today = todayRec.data ?? [];
      return {
        classes: classes ?? [],
        studentCount: enroll.count ?? 0,
        presentToday: today.filter((r: any) => r.status === "present" || r.status === "late").length,
        absentToday: today.filter((r: any) => r.status === "absent").length,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Welcome, {me?.profile?.full_name?.split(" ")[0] ?? "Teacher"}</h1></div>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={ClipboardList} label="My classes" value={data?.classes.length ?? 0} />
        <StatCard icon={Users} label="Students enrolled" value={data?.studentCount ?? 0} />
        <StatCard icon={CalendarCheck} label="Present today" value={data?.presentToday ?? 0} tone="success" />
        <StatCard icon={AlertTriangle} label="Absent today" value={data?.absentToday ?? 0} tone="warn" />
      </div>
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">My classes</h2>
          <Link to="/classes"><Button variant="ghost" size="sm">View all</Button></Link>
        </div>
        {data?.classes.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {data.classes.map(c => (
              <Link key={c.id} to="/attendance/$classId" params={{ classId: c.id }}
                    className="glass rounded-xl p-4 hover:scale-[1.02] transition-transform">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">Section {c.section}</div>
              </Link>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground">No classes assigned yet. Ask an admin to assign you.</p>}
      </div>
    </div>
  );
}
