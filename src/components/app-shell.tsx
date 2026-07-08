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
  Menu,
} from "lucide-react";
import { useStore } from "@/lib/mock-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useState, type ReactNode } from "react";

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const { currentUser, users, logout } = useStore();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const NavList = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {items.map((it) => {
        const active = path === it.to;
        const Icon = it.icon;
        return (
          <Link
            key={it.to}
            to={it.to}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "hover:bg-sidebar-accent text-sidebar-foreground"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{it.label}</span>
            {"badge" in it && it.badge ? (
              <Badge className="bg-accent text-accent-foreground">{it.badge}</Badge>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  const UserFooter = () => (
    <div className="border-t p-3 flex items-center gap-3">
      <Avatar className="h-9 w-9 shrink-0">
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
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 px-5 py-5 border-b">
          <div>
            <div className="font-semibold leading-tight">Little Stars</div>
            <div className="text-xs text-muted-foreground">Kindergarten</div>
          </div>
        </div>
        <NavList />
        <UserFooter />
      </aside>

      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-10 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b bg-background/80 backdrop-blur px-4 py-3 sm:px-6 sm:py-4">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 flex flex-col bg-sidebar text-sidebar-foreground">
              <SheetTitle className="px-5 py-5 border-b text-left">
                <div className="font-semibold leading-tight">Little Stars</div>
                <div className="text-xs font-normal text-muted-foreground">Kindergarten</div>
              </SheetTitle>
              <NavList onNavigate={() => setMobileOpen(false)} />
              <UserFooter />
            </SheetContent>
          </Sheet>
          <h1 className="truncate text-lg sm:text-2xl font-semibold">{title}</h1>
          <Badge variant="outline" className="capitalize shrink-0">{currentUser.role}</Badge>
        </header>
        <div className="p-4 sm:p-6 min-w-0">{children}</div>
      </main>
    </div>
  );
}