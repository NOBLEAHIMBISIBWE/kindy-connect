import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useStore } from "@/lib/mock-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Baby, GraduationCap, CalendarCheck, BellRing, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard - Little Stars" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { currentUser, pupils, classes, users, attendance, notifications, markArrival, markDeparture } = useStore();
  if (!currentUser) return null;
  const isStaff = currentUser.role !== "teacher";
  const today = new Date().toISOString().slice(0, 10);
  const todayAtt = attendance.filter((a) => a.date === today);
  const presentIds = new Set(todayAtt.filter((a) => a.arrival).map((a) => a.pupilId));
  const pending = users.filter((u) => u.role === "teacher" && u.status === "pending").length;

  const stats = isStaff
    ? [
        { label: "Total pupils", value: pupils.filter((p) => p.active).length, icon: Baby, color: "bg-primary/15 text-primary" },
        { label: "Classes", value: classes.length, icon: Sun, color: "bg-secondary/20 text-secondary-foreground" },
        { label: "Present today", value: presentIds.size, icon: CalendarCheck, color: "bg-chart-4/20 text-chart-4" },
        { label: "Absent today", value: pupils.filter((p) => p.active).length - presentIds.size, icon: GraduationCap, color: "bg-accent/15 text-accent" },
      ]
    : [];

  const myClassPupils = pupils.filter((p) => p.classId === currentUser.classId && p.active);

  return (
    <AppShell title={`Hello, ${currentUser.name.split(" ")[0]}`}>
      {isStaff ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.label} className="border-0 shadow-sm">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${s.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-3xl font-semibold">{s.value}</div>
                      <div className="text-sm text-muted-foreground">{s.label}</div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {pending > 0 && (
            <Card className="mt-6 border-accent/40 bg-accent/5">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BellRing className="h-5 w-5 text-accent" />
                  <div>
                    <div className="font-semibold">{pending} teacher account{pending > 1 ? "s" : ""} awaiting approval</div>
                    <div className="text-sm text-muted-foreground">Review pending registrations.</div>
                  </div>
                </div>
                <Button asChild variant="default"><a href="/app/teachers">Review</a></Button>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 mt-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Recent attendance</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {todayAtt.slice(0, 6).map((a) => {
                  const p = pupils.find((x) => x.id === a.pupilId);
                  if (!p) return null;
                  return (
                    <div key={a.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                      <span className="font-medium">{p.firstName} {p.lastName}</span>
                      <span className="text-muted-foreground">
                        {a.arrival ? `Arrived ${a.arrival}` : ""} {a.departure ? `- Left ${a.departure}` : ""}
                      </span>
                    </div>
                  );
                })}
                {todayAtt.length === 0 && <p className="text-sm text-muted-foreground">No activity yet today.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Notification delivery</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {notifications.slice(0, 6).map((n) => (
                  <div key={n.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                    <span className="truncate max-w-[60%]">{n.message}</span>
                    <Badge variant={n.status === "sent" ? "default" : "destructive"} className="uppercase text-[10px]">{n.channel} - {n.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>My class: {classes.find((c) => c.id === currentUser.classId)?.name ?? "-"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {myClassPupils.map((p) => {
                const att = todayAtt.find((a) => a.pupilId === p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border p-3">
                    <div>
                      <div className="font-medium">{p.firstName} {p.lastName}</div>
                      <div className="text-xs text-muted-foreground">
                        {att?.arrival ? `Arrived ${att.arrival}` : "Not arrived"}
                        {att?.departure ? ` - Left ${att.departure}` : ""}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" disabled={!!att?.arrival} onClick={() => { markArrival(p.id); toast.success(`Arrival marked for ${p.firstName}`); }}>Arrival</Button>
                      <Button size="sm" variant="secondary" disabled={!att?.arrival || !!att?.departure} onClick={() => { markDeparture(p.id); toast.success(`Departure marked for ${p.firstName}`); }}>Departure</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}