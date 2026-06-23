import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Baby,
  Users,
  GraduationCap,
  CalendarCheck,
  BarChart3,
  ScrollText,
  LogOut,
  BookOpen,
} from "lucide-react";
import { useStore } from "@/lib/mock-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ReactNode } from "react";

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const { currentUser, users, logout } = useStore();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  if (!currentUser) {
    if (typeof window !== "undefined") navigate({ to: "/" });
    return null;
  }

  const isStaff = currentUser.role === "admin" || currentUser.role === "deputy";
  const pendingCount = users.filter((u) => u.role === "teacher" && u.status === "pending").length;

  const items = isStaff
    ? [
        { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/app/pupils", label: "Pupils", icon: Baby },
        { to: "/app/parents", label: "Parents", icon: Users },
        { to: "/app/teachers", label: "Teachers", icon: GraduationCap, badge: pendingCount },
        { to: "/app/attendance", label: "Attendance", icon: CalendarCheck },
        { to: "/app/marks", label: "Marks", icon: BookOpen },
        { to: "/app/reports", label: "Reports", icon: BarChart3 },
        { to: "/app/audit", label: "Audit log", icon: ScrollText },
      ]
    : [
        { to: "/app/dashboard", label: "My class", icon: LayoutDashboard },
        { to: "/app/attendance", label: "Attendance", icon: CalendarCheck },
        { to: "/app/marks", label: "Marks", icon: BookOpen },
      ];

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 px-5 py-5 border-b">
          <div>
            <div className="font-semibold leading-tight">Little Stars</div>
            <div className="text-xs text-muted-foreground">Kindergarten</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map((it) => {
            const active = path === it.to;
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-sidebar-accent text-sidebar-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{it.label}</span>
                {"badge" in it && it.badge ? (
                  <Badge className="bg-accent text-accent-foreground">{it.badge}</Badge>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3 flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              {currentUser.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{currentUser.name}</div>
            <div className="text-xs text-muted-foreground capitalize">{currentUser.role}</div>
          </div>
          <Button size="icon" variant="ghost" onClick={() => { logout(); navigate({ to: "/" }); }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/80 backdrop-blur px-6 py-4">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <div className="hidden sm:flex items-center gap-2">
            <Badge variant="outline" className="capitalize">{currentUser.role}</Badge>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}