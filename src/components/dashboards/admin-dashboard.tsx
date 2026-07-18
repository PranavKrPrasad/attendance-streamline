import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "./stat-card";
import { Users, GraduationCap, ClipboardList, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { seedTeacherDemo } from "@/lib/seed-demo.functions";
import { useState } from "react";
import { toast } from "sonner";

export function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [students, teachers, classes, todayRecords, records] = await Promise.all([
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "teacher"),
        supabase.from("classes").select("id", { count: "exact", head: true }),
        supabase.from("attendance_records").select("status").gte("marked_at", new Date().toISOString().slice(0, 10)),
        supabase.from("attendance_records").select("status, class_id, marked_at").limit(500).order("marked_at", { ascending: false }),
      ]);
      const today = todayRecords.data ?? [];
      const present = today.filter(r => r.status === "present" || r.status === "late").length;
      const absent = today.filter(r => r.status === "absent").length;
      // Weekly trend
      const byDay: Record<string, { day: string; present: number; absent: number }> = {};
      (records.data ?? []).forEach(r => {
        const d = new Date(r.marked_at).toLocaleDateString(undefined, { weekday: "short" });
        byDay[d] ??= { day: d, present: 0, absent: 0 };
        if (r.status === "absent") byDay[d].absent++; else byDay[d].present++;
      });
      return {
        students: students.count ?? 0,
        teachers: teachers.count ?? 0,
        classes: classes.count ?? 0,
        todayPresent: present,
        todayAbsent: absent,
        trend: Object.values(byDay).slice(0, 7).reverse(),
      };
    },
  });

  const qc = useQueryClient();
  const seedFn = useServerFn(seedTeacherDemo);
  const [seeding, setSeeding] = useState(false);
  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await seedFn();
      toast.success(`Demo loaded — ${res.studentsAdded} students enrolled`);
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to seed demo data");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Admin overview</h1>
          <p className="text-sm text-muted-foreground">System-wide attendance and enrollment stats.</p>
        </div>
        <Button onClick={handleSeed} disabled={seeding} variant="outline" className="gap-2">
          {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Load demo data
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Users} label="Students" value={data?.students ?? 0} />
        <StatCard icon={GraduationCap} label="Teachers" value={data?.teachers ?? 0} />
        <StatCard icon={ClipboardList} label="Classes" value={data?.classes ?? 0} />
        <StatCard icon={AlertTriangle} label="Absent today" value={data?.todayAbsent ?? 0} tone="warn" />
      </div>
      <div className="glass-card rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Attendance trend</h2>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={data?.trend ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="present" fill="oklch(0.55 0.22 275)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="absent" fill="oklch(0.6 0.24 25)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
