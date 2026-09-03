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
  BookMarked,
  ClipboardList,
  School,
  Building2,
  Phone,
  Mail,
  WalletCards,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SchoolSelector } from "@/components/school-selector";
import { useEffect, type ReactNode } from "react";

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const { currentUser, users = [], logout, schools = [], loading = false } = useStore();
  const { isLocked } = useStore() as any;
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !currentUser) {
      navigate({ to: "/" });
    }
  }, [loading, currentUser, navigate]);

  if (loading && !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading Noble Edu...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  const isSuperAdmin = currentUser.role === "super_admin";
  const isStaff = currentUser.role === "admin" || currentUser.role === "deputy";
  const pendingCount = (users || []).filter((u) => u?.role === "teacher" && u?.status === "pending").length;
  const currentSchool = (schools || []).find((s) => s?.id === currentUser.schoolId);

  const items = isSuperAdmin
    ? [
        { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/app/schools", label: "Schools", icon: School },
        { to: "/app/users", label: "Users", icon: Users },
        { to: "/app/teachers", label: "Teachers", icon: GraduationCap, badge: pendingCount },
        { to: "/app/classes", label: "Classes", icon: Building2 },
        { to: "/app/subjects", label: "Subjects", icon: BookMarked },
        { to: "/app/audit", label: "Audit log", icon: ScrollText },
      ]
    : isStaff
      ? [
          { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { to: "/app/pupils", label: "Pupils", icon: Baby },
          { to: "/app/parents", label: "Parents", icon: Users },
          { to: "/app/teachers", label: "Teachers", icon: GraduationCap, badge: pendingCount },
          { to: "/app/classes", label: "Classes", icon: BookOpen },
          { to: "/app/subjects", label: "Subjects", icon: BookMarked },
          { to: "/app/attendance", label: "Attendance", icon: CalendarCheck },
          { to: "/app/marks", label: "Marks", icon: ClipboardList },
          { to: "/app/reports", label: "Reports", icon: BarChart3 },
          { to: "/app/fees", label: "Fees", icon: WalletCards },
          { to: "/app/audit", label: "Audit log", icon: ScrollText },
        ]
      : [
          { to: "/app/dashboard", label: "My class", icon: LayoutDashboard },
          { to: "/app/subjects", label: "Subjects", icon: BookMarked },
          { to: "/app/attendance", label: "Attendance", icon: CalendarCheck },
          { to: "/app/marks", label: "Marks", icon: ClipboardList },
        ];

  return (
    <div className="flex min-h-screen w-full bg-background">
      {isLocked ? <div /> : null}
      <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar text-sidebar-foreground print:hidden">
        <div className="flex items-center gap-2 px-5 py-5 border-b">
          <div>
            <div className="font-semibold leading-tight truncate max-w-[200px]">
              {isSuperAdmin ? "System Admin" : currentSchool?.name || "Noble Edu"}
            </div>
            <div className="text-xs text-muted-foreground">
              {isSuperAdmin ? "Management Console" : "School Section"}
            </div>
          </div>
        </div>
        <SchoolSelector />
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
        <div className="border-t p-3 space-y-3">
          <div className="rounded-lg bg-muted/40 p-2.5 text-xs space-y-1">
            <div className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">
              For Inquiries
            </div>
            <a
              href="tel:0786951347"
              className="flex items-center gap-1.5 font-medium text-foreground hover:underline"
            >
              <Phone className="h-3 w-3 text-primary shrink-0" />
              <span>0786951347</span>
            </a>
            <a
              href="mailto:nobleahimbisibwe5@gmail.com"
              className="flex items-center gap-1.5 text-muted-foreground hover:underline truncate"
              title="nobleahimbisibwe5@gmail.com"
            >
              <Mail className="h-3 w-3 text-primary shrink-0" />
              <span className="truncate">nobleahimbisibwe5@gmail.com</span>
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-secondary text-secondary-foreground">
                {(currentUser.name || "User")
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{currentUser.name || "User"}</div>
              <div className="text-xs text-muted-foreground capitalize">
                {(currentUser.role || "").replace("_", " ")}
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                logout();
                navigate({ to: "/" });
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/80 backdrop-blur px-6 py-4 print:hidden">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="capitalize">
              {(currentUser.role || "").replace("_", " ")}
            </Badge>
            <div className="hidden lg:flex items-center gap-3 rounded-lg border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
              <span className="font-semibold text-foreground">Inquiries:</span>
              <a
                href="tel:0786951347"
                className="flex items-center gap-1 font-medium text-foreground hover:text-primary hover:underline"
              >
                <Phone className="h-3.5 w-3.5 text-primary" />
                0786951347
              </a>
              <span className="text-border">•</span>
              <a
                href="mailto:nobleahimbisibwe5@gmail.com"
                className="flex items-center gap-1 font-medium text-foreground hover:text-primary hover:underline"
              >
                <Mail className="h-3.5 w-3.5 text-primary" />
                nobleahimbisibwe5@gmail.com
              </a>
            </div>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
