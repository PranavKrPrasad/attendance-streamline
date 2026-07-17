import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/departments")({
  component: DeptPage,
});

function DeptPage() {
  const qc = useQueryClient();
  const [name, setName] = useState(""); const [code, setCode] = useState("");
  const { data } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => (await supabase.from("departments").select("*").order("name")).data ?? [],
  });
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("departments").insert({ name, code });
    if (error) return toast.error(error.message);
    toast.success("Department added"); setName(""); setCode("");
    qc.invalidateQueries({ queryKey: ["departments"] });
  };
  const del = async (id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from("departments").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["departments"] });
  };
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-3xl font-bold">Departments</h1>
      <form onSubmit={add} className="glass-card rounded-2xl p-5 flex gap-2 flex-wrap">
        <Input placeholder="Name (Computer Science)" required value={name} onChange={e => setName(e.target.value)} className="flex-1 min-w-40" />
        <Input placeholder="Code (CS)" required value={code} onChange={e => setCode(e.target.value)} className="w-32" />
        <Button type="submit" className="gradient-primary text-primary-foreground border-0">Add</Button>
      </form>
      <div className="glass-card rounded-2xl p-5 space-y-2">
        {data?.map(d => (
          <div key={d.id} className="flex justify-between items-center p-2 border-b border-border/40 last:border-0">
            <div><div className="font-medium">{d.name}</div><div className="text-xs text-muted-foreground">{d.code}</div></div>
            <Button size="icon" variant="ghost" onClick={() => del(d.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        {!data?.length && <p className="text-sm text-muted-foreground text-center py-4">No departments yet.</p>}
      </div>
    </div>
  );
}
