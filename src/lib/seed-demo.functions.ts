import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STUDENTS = [
  { name: "Aarav Sharma", roll: "CS-001" },
  { name: "Isha Patel", roll: "CS-002" },
  { name: "Rohan Verma", roll: "CS-003" },
  { name: "Priya Nair", roll: "CS-004" },
  { name: "Kabir Singh", roll: "CS-005" },
  { name: "Meera Iyer", roll: "CS-006" },
  { name: "Arjun Reddy", roll: "CS-007" },
  { name: "Sanya Kapoor", roll: "CS-008" },
];

export const seedTeacherDemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Verify caller is teacher or admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roleList = (roles ?? []).map((r) => r.role);
    if (!roleList.includes("teacher") && !roleList.includes("admin")) {
      throw new Error("Only teachers or admins can seed demo data");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Department
    const deptCode = "DEMO";
    let { data: dept } = await supabaseAdmin
      .from("departments")
      .select("id")
      .eq("code", deptCode)
      .maybeSingle();
    if (!dept) {
      const { data, error } = await supabaseAdmin
        .from("departments")
        .insert({ name: "Computer Science (Demo)", code: deptCode })
        .select("id")
        .single();
      if (error) throw error;
      dept = data;
    }

    // Subject
    const subjCode = "CS101-DEMO";
    let { data: subj } = await supabaseAdmin
      .from("subjects")
      .select("id")
      .eq("code", subjCode)
      .maybeSingle();
    if (!subj) {
      const { data, error } = await supabaseAdmin
        .from("subjects")
        .insert({ name: "Intro to Computer Science", code: subjCode, department_id: dept!.id, credits: 4 })
        .select("id")
        .single();
      if (error) throw error;
      subj = data;
    }

    // Class assigned to caller
    const className = "Demo Class — CS101";
    let { data: cls } = await supabaseAdmin
      .from("classes")
      .select("id")
      .eq("name", className)
      .eq("teacher_id", userId)
      .maybeSingle();
    if (!cls) {
      const { data, error } = await supabaseAdmin
        .from("classes")
        .insert({
          name: className,
          section: "A",
          semester: 1,
          teacher_id: userId,
          subject_id: subj!.id,
          department_id: dept!.id,
          low_attendance_threshold: 75,
        })
        .select("id")
        .single();
      if (error) throw error;
      cls = data;
    }

    // Create student auth users + profiles + enrollments
    const studentIds: string[] = [];
    for (const s of STUDENTS) {
      const email = `${s.roll.toLowerCase()}@demo.classpulse.local`;
      // Try to find existing profile
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      let sid = existing?.id as string | undefined;

      if (!sid) {
        const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: `Demo!${s.roll}`,
          email_confirm: true,
          user_metadata: { full_name: s.name, role: "student" },
        });
        if (cErr) throw cErr;
        sid = created.user!.id;
        // Update roll number on profile (trigger auto-creates it)
        await supabaseAdmin.from("profiles").update({ roll_number: s.roll }).eq("id", sid);
      }

      studentIds.push(sid!);

      // Enroll
      await supabaseAdmin
        .from("class_enrollments")
        .upsert({ class_id: cls!.id, student_id: sid! }, { onConflict: "class_id,student_id" });
    }

    // Historical attendance sessions (last 10 weekdays)
    const { data: existingSessions } = await supabaseAdmin
      .from("attendance_sessions")
      .select("id")
      .eq("class_id", cls!.id);

    if ((existingSessions?.length ?? 0) < 5) {
      const today = new Date();
      for (let i = 1; i <= 10; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        if (d.getDay() === 0 || d.getDay() === 6) continue;
        const dateStr = d.toISOString().slice(0, 10);

        const { data: sess, error: sErr } = await supabaseAdmin
          .from("attendance_sessions")
          .insert({
            class_id: cls!.id,
            teacher_id: userId,
            session_date: dateStr,
            started_at: `${dateStr}T09:00:00Z`,
            ended_at: `${dateStr}T10:00:00Z`,
          })
          .select("id")
          .single();
        if (sErr) continue;

        type S = "present" | "late" | "absent";
        const records = studentIds.map((sid) => {
          const r = Math.random();
          const status: S = r < 0.8 ? "present" : r < 0.9 ? "late" : "absent";
          return {
            session_id: sess!.id,
            class_id: cls!.id,
            student_id: sid,
            status,
            marked_by: userId,
            marked_at: `${dateStr}T09:${Math.floor(Math.random() * 30) + 10}:00Z`,
          };
        });
        await supabaseAdmin.from("attendance_records").insert(records);
      }
    }

    return {
      ok: true,
      classId: cls!.id,
      studentsAdded: studentIds.length,
    };
  });
