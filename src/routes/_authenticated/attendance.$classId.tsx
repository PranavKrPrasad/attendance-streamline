import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Queue } from "@/lib/queue";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Play, Square, Check, X, Clock, HeartPulse, User, Download, Users } from "lucide-react";
import { downloadCSV } from "@/lib/csv";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/attendance/$classId")({
  component: AttendancePage,
});

type Student = { id: string; full_name: string; email: string; roll_number: string | null };
type Status = "present" | "absent" | "late" | "medical" | "half_day";

function AttendancePage() {
  const { classId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [queueVersion, setQueueVersion] = useState(0);
  const [marked, setMarked] = useState<Record<string, Status>>({});
  const [queue] = useState(() => new Queue<Student>());

  const { data: klass } = useQuery({
    queryKey: ["class", classId],
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("*, subjects(name, code)").eq("id", classId).maybeSingle();
      return data;
    },
  });

  const { data: students } = useQuery({
    queryKey: ["class-students", classId],
    queryFn: async () => {
      const { data } = await supabase
        .from("class_enrollments")
        .select("student_id, profiles!class_enrollments_student_id_fkey(id, full_name, email, roll_number)")
        .eq("class_id", classId);
      return (data ?? []).map((e: any) => e.profiles).filter(Boolean) as Student[];
    },
  });

  const canManage = me?.role === "admin" || (me?.role === "teacher" && klass?.teacher_id === me.user.id);

  const startSession = async () => {
    if (!canManage) return toast.error("You aren't the teacher of this class.");
    const { data, error } = await supabase.from("attendance_sessions")
      .insert({ class_id: classId, teacher_id: me!.user.id })
      .select().single();
    if (error) return toast.error(error.message);
    setSessionId(data.id);
    setMarked({});
    queue.clear();
    (students ?? []).forEach(s => queue.enqueue(s));
    setQueueVersion(v => v + 1);
    toast.success(`Session started — ${queue.size} students queued`);
  };

  const endSession = async () => {
    if (!sessionId) return;
    // Auto-mark remaining as absent
    const remaining = queue.toArray();
    if (remaining.length) {
      await supabase.from("attendance_records").insert(
        remaining.map(s => ({ session_id: sessionId, class_id: classId, student_id: s.id, status: "absent" as const, marked_by: me!.user.id }))
      );
    }
    await supabase.from("attendance_sessions").update({ ended_at: new Date().toISOString() }).eq("id", sessionId);
    toast.success("Session ended");
    setSessionId(null);
    queue.clear();
    setQueueVersion(v => v + 1);
    qc.invalidateQueries({ queryKey: ["attendance-history", classId] });
  };

  const markCurrent = async (status: Status) => {
    const s = queue.dequeue();
    if (!s || !sessionId) return;
    const { error } = await supabase.from("attendance_records").insert({
      session_id: sessionId, class_id: classId, student_id: s.id, status, marked_by: me!.user.id,
    });
    if (error) { toast.error(error.message); queue.enqueue(s); }
    else setMarked(m => ({ ...m, [s.id]: status }));
    setQueueVersion(v => v + 1);
    if (queue.isEmpty) toast.success("Queue empty — everyone processed");
  };

  const { data: history } = useQuery({
    queryKey: ["attendance-history", classId],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_records")
        .select("status, marked_at, profiles!attendance_records_student_id_fkey(full_name, email)")
        .eq("class_id", classId)
        .order("marked_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const summary = useMemo(() => {
    const students = new Map<string, { name: string; total: number; present: number }>();
    (history ?? []).forEach((r: any) => {
      const name = r.profiles?.full_name ?? "Unknown";
      const key = r.profiles?.email ?? name;
      const cur = students.get(key) ?? { name, total: 0, present: 0 };
      cur.total++;
      if (r.status === "present" || r.status === "late") cur.present++;
      students.set(key, cur);
    });
    return Array.from(students.entries()).map(([email, s]) => ({
      email, name: s.name, total: s.total, present: s.present,
      percentage: s.total ? Math.round((s.present / s.total) * 100) : 0,
    }));
  }, [history]);

  const threshold = klass?.low_attendance_threshold ?? 75;

  const exportCSV = () => {
    downloadCSV(`${klass?.name ?? "class"}-attendance.csv`, summary.map(s => ({
      student: s.name, email: s.email, total_sessions: s.total, present: s.present,
      percentage: `${s.percentage}%`, status: s.percentage < threshold ? "LOW" : "OK",
    })));
  };

  const current = queue.peek();
  const remaining = queue.toArray();

  useEffect(() => { /* ensure re-render on queueVersion */ }, [queueVersion]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <button onClick={() => navigate({ to: "/classes" })} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
          <h1 className="text-3xl font-bold mt-1">{klass?.name}</h1>
          <p className="text-sm text-muted-foreground">{(klass as any)?.subjects?.code} · Section {klass?.section} · Threshold {threshold}%</p>
        </div>
        <div className="flex gap-2">
          {canManage && !sessionId && (
            <Button onClick={startSession} className="gradient-primary text-primary-foreground border-0"><Play className="h-4 w-4 mr-1" /> Start session</Button>
          )}
          {canManage && sessionId && (
            <Button onClick={endSession} variant="destructive"><Square className="h-4 w-4 mr-1" /> End session</Button>
          )}
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Export</Button>
        </div>
      </div>

      {sessionId ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">Now marking <Badge variant="secondary">Queue: {queue.size}</Badge></h2>
            {current ? (
              <div className="text-center py-8 animate-fade-in" key={current.id}>
                <div className="mx-auto h-24 w-24 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-3xl font-bold glow mb-4">
                  {current.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="text-2xl font-bold">{current.full_name}</div>
                <div className="text-sm text-muted-foreground">{current.roll_number ?? current.email}</div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-6">
                  <Button onClick={() => markCurrent("present")} className="bg-success text-success-foreground hover:bg-success/90"><Check className="h-4 w-4 mr-1" />Present</Button>
                  <Button onClick={() => markCurrent("late")} className="bg-warning text-warning-foreground hover:bg-warning/90"><Clock className="h-4 w-4 mr-1" />Late</Button>
                  <Button onClick={() => markCurrent("absent")} variant="destructive"><X className="h-4 w-4 mr-1" />Absent</Button>
                  <Button onClick={() => markCurrent("medical")} variant="outline"><HeartPulse className="h-4 w-4 mr-1" />Medical</Button>
                  <Button onClick={() => markCurrent("half_day")} variant="outline"><User className="h-4 w-4 mr-1" />Half</Button>
                </div>
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">Queue empty. End the session to save.</p>
            )}
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-semibold mb-4">Upcoming in queue</h2>
            <div className="space-y-2 max-h-96 overflow-auto">
              {remaining.slice(1).map((s, i) => (
                <div key={s.id} className="glass rounded-lg px-3 py-2 flex items-center gap-3 animate-fade-in">
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{i + 2}</div>
                  <div className="flex-1"><div className="text-sm font-medium">{s.full_name}</div><div className="text-[10px] text-muted-foreground">{s.roll_number ?? s.email}</div></div>
                </div>
              ))}
              {remaining.length <= 1 && <p className="text-xs text-muted-foreground">No one else in queue.</p>}
            </div>
            {Object.keys(marked).length > 0 && (
              <>
                <h3 className="font-semibold mt-6 mb-2 text-sm">Marked this session ({Object.keys(marked).length})</h3>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(marked).map(([id, st]) => {
                    const s = students?.find(x => x.id === id);
                    return <Badge key={id} variant={st === "absent" ? "destructive" : "secondary"} className="text-[10px]">{s?.full_name?.split(" ")[0]}: {st}</Badge>;
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Users className="h-4 w-4" /> Class roster & summary</h2>
          {students?.length ? (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground border-b">
                  <tr><th className="py-2">Student</th><th>Roll</th><th>Sessions</th><th>Present</th><th>%</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {students.map(s => {
                    const stat = summary.find(x => x.email === s.email);
                    const pct = stat?.percentage ?? 0;
                    const low = stat && pct < threshold;
                    return (
                      <tr key={s.id} className={`border-b border-border/40 ${low ? "bg-destructive/10" : ""}`}>
                        <td className="py-2 font-medium">{s.full_name}</td>
                        <td>{s.roll_number ?? "—"}</td>
                        <td>{stat?.total ?? 0}</td>
                        <td>{stat?.present ?? 0}</td>
                        <td className={low ? "text-destructive font-semibold" : ""}>{stat ? `${pct}%` : "—"}</td>
                        <td>{low ? <Badge variant="destructive">LOW</Badge> : stat ? <Badge variant="secondary">OK</Badge> : <Badge variant="outline">—</Badge>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-muted-foreground">No students enrolled. Add them from the Classes admin page.</p>}
        </div>
      )}
    </div>
  );
}
