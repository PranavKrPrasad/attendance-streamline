import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ClipboardList, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/classes")({
  component: ClassesPage,
});

function ClassesPage() {
  const { data: me } = useCurrentUser();
  const { data: classes } = useQuery({
    queryKey: ["my-classes", me?.user.id, me?.role],
    enabled: !!me,
    queryFn: async () => {
      const q = supabase.from("classes").select("id, name, section, semester, subjects(name, code)");
      if (me!.role === "teacher") q.eq("teacher_id", me!.user.id);
      const { data } = await q.order("name");
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My classes</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {classes?.map((c: any) => (
          <Link key={c.id} to="/attendance/$classId" params={{ classId: c.id }}
                className="glass-card rounded-2xl p-5 hover:scale-[1.02] transition group">
            <div className="flex justify-between items-start">
              <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground">
                <ClipboardList className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition" />
            </div>
            <div className="mt-4 font-semibold">{c.name}</div>
            <div className="text-xs text-muted-foreground">{c.subjects?.code} • Section {c.section} • Sem {c.semester}</div>
          </Link>
        ))}
        {!classes?.length && <p className="text-sm text-muted-foreground">No classes yet.</p>}
      </div>
    </div>
  );
}
