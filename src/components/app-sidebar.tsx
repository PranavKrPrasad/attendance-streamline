import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarHeader,
} from "@/components/ui/sidebar";
import { GraduationCap, LayoutDashboard, Users, BookOpen, Building2, ClipboardList, LogOut, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, type AppRole } from "@/hooks/use-current-user";
import { useQueryClient } from "@tanstack/react-query";

const navByRole: Record<AppRole, { title: string; url: string; icon: any }[]> = {
  admin: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Departments", url: "/admin/departments", icon: Building2 },
    { title: "Subjects", url: "/admin/subjects", icon: BookOpen },
    { title: "Classes", url: "/admin/classes", icon: ClipboardList },
    { title: "Users", url: "/admin/users", icon: Users },
  ],
  teacher: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "My Classes", url: "/classes", icon: ClipboardList },
  ],
  student: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "My Attendance", url: "/my-attendance", icon: CalendarCheck },
  ],
};

export function AppSidebar() {
  const { data } = useCurrentUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const role = data?.role ?? "student";
  const items = navByRole[role];

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground">
            <GraduationCap className="h-4 w-4" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-bold text-sm">ClassPulse</span>
            <span className="text-[10px] text-muted-foreground capitalize">{role}</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 group-data-[collapsible=icon]:hidden">
          <div className="text-xs font-medium truncate">{data?.profile?.full_name}</div>
          <div className="text-[10px] text-muted-foreground truncate">{data?.user?.email}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="justify-start">
          <LogOut className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
