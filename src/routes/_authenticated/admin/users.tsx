import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

function UsersPage() {
  const qc = useQueryClient();
  const { data: users } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("full_name");
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const rmap = new Map<string, string[]>();
      (roles ?? []).forEach(r => rmap.set(r.user_id, [...(rmap.get(r.user_id) ?? []), r.role]));
      return (profiles ?? []).map(p => ({ ...p, roles: rmap.get(p.id) ?? [] }));
    },
  });

  const setRole = async (userId: string, role: "admin" | "teacher" | "student") => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) return toast.error(error.message);
    toast.success("Role updated");
    qc.invalidateQueries({ queryKey: ["all-users"] });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Users</h1>
      <div className="glass-card rounded-2xl p-5 overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground border-b"><tr><th className="py-2">Name</th><th>Email</th><th>Role</th><th>Change</th></tr></thead>
          <tbody>
            {users?.map(u => (
              <tr key={u.id} className="border-b border-border/40">
                <td className="py-2 font-medium">{u.full_name}</td>
                <td>{u.email}</td>
                <td>{u.roles.map(r => <Badge key={r} variant="secondary" className="mr-1 capitalize">{r}</Badge>)}</td>
                <td className="flex gap-1 py-2">
                  <Button size="sm" variant="outline" onClick={() => setRole(u.id, "student")}>Student</Button>
                  <Button size="sm" variant="outline" onClick={() => setRole(u.id, "teacher")}>Teacher</Button>
                  <Button size="sm" variant="outline" onClick={() => setRole(u.id, "admin")}>Admin</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
