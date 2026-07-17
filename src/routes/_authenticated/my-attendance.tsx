import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { downloadCSV } from "@/lib/csv";

export const Route = createFileRoute("/_authenticated/my-attendance")({
  component: MyAttendance,
});

function MyAttendance() {
  const { data: me } = useCurrentUser();
  const { data: records } = useQuery({
    queryKey: ["my-records", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_records")
        .select("status, marked_at, classes(name, subjects(code))")
        .eq("student_id", me!.user.id)
        .order("marked_at", { ascending: false });
      return data ?? [];
    },
  });

  const exportCSV = () => {
    downloadCSV("my-attendance.csv", (records ?? []).map((r: any) => ({
      date: new Date(r.marked_at).toLocaleString(),
      class: r.classes?.name, code: r.classes?.subjects?.code, status: r.status,
    })));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My attendance</h1>
        <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Export</Button>
      </div>
      <div className="glass-card rounded-2xl p-6 overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground border-b"><tr><th className="py-2">Date</th><th>Class</th><th>Status</th></tr></thead>
          <tbody>
            {records?.map((r: any, i) => (
              <tr key={i} className="border-b border-border/40">
                <td className="py-2">{new Date(r.marked_at).toLocaleString()}</td>
                <td>{r.classes?.name} <span className="text-muted-foreground text-xs">({r.classes?.subjects?.code})</span></td>
                <td><Badge variant={r.status === "absent" ? "destructive" : r.status === "late" ? "outline" : "secondary"}>{r.status}</Badge></td>
              </tr>
            ))}
            {!records?.length && <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">No records yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
