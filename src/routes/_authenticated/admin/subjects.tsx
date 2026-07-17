import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/subjects")({
  component: SubjectsPage,
});

function SubjectsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", code: "", department_id: "", credits: 3 });
  const { data: depts } = useQuery({ queryKey: ["departments"], queryFn: async () => (await supabase.from("departments").select("*").order("name")).data ?? [] });
  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: async () => (await supabase.from("subjects").select("*, departments(name)").order("name")).data ?? [] });
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("subjects").insert({ ...form, department_id: form.department_id || null });
    if (error) return toast.error(error.message);
    toast.success("Subject added"); setForm({ name: "", code: "", department_id: "", credits: 3 });
    qc.invalidateQueries({ queryKey: ["subjects"] });
  };
  const del = async (id: string) => { if (!confirm("Delete?")) return; await supabase.from("subjects").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["subjects"] }); };
  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-3xl font-bold">Subjects</h1>
      <form onSubmit={add} className="glass-card rounded-2xl p-5 grid gap-2 md:grid-cols-5">
        <Input placeholder="Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="md:col-span-2" />
        <Input placeholder="Code" required value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
        <Select value={form.department_id} onValueChange={v => setForm({ ...form, department_id: v })}>
          <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>{depts?.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
        </Select>
        <Button type="submit" className="gradient-primary text-primary-foreground border-0">Add</Button>
      </form>
      <div className="glass-card rounded-2xl p-5 space-y-2">
        {subjects?.map((s: any) => (
          <div key={s.id} className="flex justify-between items-center p-2 border-b border-border/40 last:border-0">
            <div><div className="font-medium">{s.name} <span className="text-xs text-muted-foreground">({s.code})</span></div><div className="text-xs text-muted-foreground">{s.departments?.name ?? "No dept"}</div></div>
            <Button size="icon" variant="ghost" onClick={() => del(s.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
