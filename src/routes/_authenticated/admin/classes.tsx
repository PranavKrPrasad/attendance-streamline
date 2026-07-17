import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Users, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/classes")({
  component: ClassesAdmin,
});

function ClassesAdmin() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", subject_id: "", teacher_id: "", department_id: "", section: "A", semester: 1, low_attendance_threshold: 75 });

  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: async () => (await supabase.from("subjects").select("*")).data ?? [] });
  const { data: depts } = useQuery({ queryKey: ["departments"], queryFn: async () => (await supabase.from("departments").select("*")).data ?? [] });
  const { data: teachers } = useQuery({
    queryKey: ["teachers-list"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "teacher");
      const ids = (roles ?? []).map(r => r.user_id);
      if (!ids.length) return [];
      const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      return data ?? [];
    },
  });
  const { data: classes } = useQuery({
    queryKey: ["all-classes"],
    queryFn: async () => (await supabase.from("classes").select("*, subjects(name, code), departments(name)").order("name")).data ?? [],
  });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("classes").insert({
      ...form,
      subject_id: form.subject_id || null,
      teacher_id: form.teacher_id || null,
      department_id: form.department_id || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Class created");
    setForm({ name: "", subject_id: "", teacher_id: "", department_id: "", section: "A", semester: 1, low_attendance_threshold: 75 });
    qc.invalidateQueries({ queryKey: ["all-classes"] });
  };
  const del = async (id: string) => { if (!confirm("Delete class?")) return; await supabase.from("classes").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["all-classes"] }); };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Classes</h1>
      <form onSubmit={add} className="glass-card rounded-2xl p-5 grid gap-3 md:grid-cols-3">
        <div><Label>Class name</Label><Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>Subject</Label>
          <Select value={form.subject_id} onValueChange={v => setForm({ ...form, subject_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>{subjects?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Teacher</Label>
          <Select value={form.teacher_id} onValueChange={v => setForm({ ...form, teacher_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>{teachers?.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Department</Label>
          <Select value={form.department_id} onValueChange={v => setForm({ ...form, department_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>{depts?.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Section</Label><Input value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} /></div>
        <div><Label>Semester</Label><Input type="number" value={form.semester} onChange={e => setForm({ ...form, semester: Number(e.target.value) })} /></div>
        <div><Label>Low-attendance threshold %</Label><Input type="number" value={form.low_attendance_threshold} onChange={e => setForm({ ...form, low_attendance_threshold: Number(e.target.value) })} /></div>
        <div className="md:col-span-3"><Button type="submit" className="gradient-primary text-primary-foreground border-0 w-full">Create class</Button></div>
      </form>
      <div className="glass-card rounded-2xl p-5 space-y-2">
        {classes?.map((c: any) => (
          <div key={c.id} className="flex justify-between items-center p-2 border-b border-border/40 last:border-0">
            <div>
              <div className="font-medium">{c.name} <span className="text-xs text-muted-foreground">· {c.subjects?.code}</span></div>
              <div className="text-xs text-muted-foreground">Sec {c.section} · Sem {c.semester} · Threshold {c.low_attendance_threshold}%</div>
            </div>
            <div className="flex gap-1">
              <EnrollDialog classId={c.id} />
              <Button size="icon" variant="ghost" onClick={() => del(c.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
        {!classes?.length && <p className="text-sm text-muted-foreground text-center py-4">No classes yet.</p>}
      </div>
    </div>
  );
}

function EnrollDialog({ classId }: { classId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: students } = useQuery({
    queryKey: ["students-list", open],
    enabled: open,
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "student");
      const ids = (roles ?? []).map(r => r.user_id);
      if (!ids.length) return [];
      return (await supabase.from("profiles").select("id, full_name, email").in("id", ids)).data ?? [];
    },
  });
  const { data: enrolled } = useQuery({
    queryKey: ["enrolled", classId, open],
    enabled: open,
    queryFn: async () => (await supabase.from("class_enrollments").select("student_id").eq("class_id", classId)).data ?? [],
  });
  const enrolledIds = new Set((enrolled ?? []).map(e => e.student_id));
  const toggle = async (sid: string) => {
    if (enrolledIds.has(sid)) {
      await supabase.from("class_enrollments").delete().eq("class_id", classId).eq("student_id", sid);
    } else {
      await supabase.from("class_enrollments").insert({ class_id: classId, student_id: sid });
    }
    qc.invalidateQueries({ queryKey: ["enrolled", classId] });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="icon" variant="ghost"><Users className="h-4 w-4" /></Button></DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Enroll students</DialogTitle></DialogHeader>
        <div className="max-h-96 overflow-auto space-y-1">
          {students?.map(s => (
            <button key={s.id} onClick={() => toggle(s.id)} className={`w-full text-left p-2 rounded flex justify-between items-center hover:bg-accent ${enrolledIds.has(s.id) ? "bg-accent" : ""}`}>
              <span><div className="text-sm font-medium">{s.full_name}</div><div className="text-xs text-muted-foreground">{s.email}</div></span>
              {enrolledIds.has(s.id) ? <Badge>Enrolled</Badge> : <Plus className="h-4 w-4" />}
            </button>
          ))}
          {!students?.length && <p className="text-sm text-muted-foreground text-center py-4">No students yet.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { Badge } from "@/components/ui/badge";
