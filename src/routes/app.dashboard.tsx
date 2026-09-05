import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Baby,
  GraduationCap,
  CalendarCheck,
  BellRing,
  Sun,
  RotateCcw,
  Building,
  ClipboardList,
  ShieldCheck,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Lock,
  BookMarked,
  Building2,
  Phone,
  Mail,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard - Noble Edu" }] }),
  component: Dashboard,
});

function Dashboard() {
  const {
    currentUser,
    pupils = [],
    classes = [],
    users = [],
    attendance = [],
    notifications = [],
    markArrival,
    markDeparture,
    parents = [],
    schools = [],
    audit = [],
    subjects = [],
    loading,
  } = useStore();
  const [arrivalDialogOpen, setArrivalDialogOpen] = useState(false);
  const [departureDialogOpen, setDepartureDialogOpen] = useState(false);
  const [selectedPupil, setSelectedPupil] = useState<any>(null);
  const [arrivalForm, setArrivalForm] = useState({
    transport: "",
    vehicleReg: "",
    personName: "",
    personRelation: "",
    phone: "",
  });
  const [departureForm, setDepartureForm] = useState({
    transport: "",
    vehicleReg: "",
    personName: "",
    personRelation: "",
    phone: "",
  });
  const [teacherFilter, setTeacherFilter] = useState<"all" | "present" | "absent">("all");

  const transportModes = ["Car", "School Bus", "Motorcycle", "Walking", "Bicycle", "Van", "Taxi"];
  const relations = [
    "Mother",
    "Father",
    "Guardian",
    "Driver",
    "Uncle",
    "Aunt",
    "Grandparent",
    "Sibling",
  ];

  const handleArrival = () => {
    if (
      !selectedPupil ||
      !arrivalForm.transport ||
      !arrivalForm.personName ||
      !arrivalForm.personRelation ||
      !arrivalForm.phone
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    markArrival(selectedPupil.id, {
      transport: arrivalForm.transport,
      vehicleReg: arrivalForm.vehicleReg,
      personName: arrivalForm.personName,
      personRelation: arrivalForm.personRelation,
      phone: arrivalForm.phone,
    });

    toast.success(`Arrival logged for ${selectedPupil.firstName} ${selectedPupil.lastName}`);
    setArrivalDialogOpen(false);
    setSelectedPupil(null);
    setArrivalForm({
      transport: "",
      vehicleReg: "",
      personName: "",
      personRelation: "",
      phone: "",
    });
  };

  const handleDeparture = () => {
    if (
      !selectedPupil ||
      !departureForm.transport ||
      !departureForm.personName ||
      !departureForm.personRelation ||
      !departureForm.phone
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    markDeparture(selectedPupil.id, {
      transport: departureForm.transport,
      vehicleReg: departureForm.vehicleReg,
      personName: departureForm.personName,
      personRelation: departureForm.personRelation,
      phone: departureForm.phone,
    });

    toast.success(`Departure logged for ${selectedPupil.firstName} ${selectedPupil.lastName}`);
    setDepartureDialogOpen(false);
    setSelectedPupil(null);
    setDepartureForm({
      transport: "",
      vehicleReg: "",
      personName: "",
      personRelation: "",
      phone: "",
    });
  };

  const handleQuickArrival = (pupil: any) => {
    markArrival(pupil.id);
    toast.success(`Arrival logged for ${pupil.firstName} ${pupil.lastName} - parents notified`);
  };

  const openArrivalDialog = (pupil: any) => {
    setSelectedPupil(pupil);
    const parent = parents.find((pr) => pupil.parentIds?.includes(pr.id));
    setArrivalForm({
      transport: "Car",
      vehicleReg: "",
      personName: parent ? parent.name : "",
      personRelation: parent ? parent.relationship || "Parent" : "Parent",
      phone: parent ? parent.phone : "",
    });
    setArrivalDialogOpen(true);
  };

  const handleQuickDeparture = (pupil: any) => {
    markDeparture(pupil.id);
    toast.success(`Departure logged for ${pupil.firstName} ${pupil.lastName} - parents notified`);
  };

  const openDepartureDialog = (pupil: any) => {
    setSelectedPupil(pupil);
    const parent = parents.find((pr) => pupil.parentIds?.includes(pr.id));
    setDepartureForm({
      transport: "Car",
      vehicleReg: "",
      personName: parent ? parent.name : "",
      personRelation: parent ? parent.relationship || "Parent" : "Parent",
      phone: parent ? parent.phone : "",
    });
    setDepartureDialogOpen(true);
  };
  const isStaff = currentUser?.role !== "teacher";
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayAtt = useMemo(
    () => (attendance || []).filter((a) => a && a.date === today),
    [attendance, today],
  );

  const todayAttMap = useMemo(() => {
    const map = new Map();
    todayAtt.forEach((a) => {
      if (a && a.pupilId) map.set(a.pupilId, a);
    });
    return map;
  }, [todayAtt]);

  const presentIds = useMemo(
    () => new Set(todayAtt.filter((a) => a && a.arrival).map((a) => a.pupilId)),
    [todayAtt],
  );

  const pending = useMemo(
    () => (users || []).filter((u) => u && u.role === "teacher" && u.status === "pending").length,
    [users],
  );

  const activePupilsCount = useMemo(
    () => (pupils || []).filter((p) => p && p.active).length,
    [pupils],
  );

  const stats = useMemo(
    () =>
      isStaff
        ? [
            {
              label: "Total pupils",
              value: activePupilsCount,
              icon: Baby,
              color: "bg-primary/15 text-primary",
            },
            {
              label: "Classes",
              value: (classes || []).length,
              icon: Sun,
              color: "bg-secondary/20 text-secondary-foreground",
            },
            {
              label: "Present today",
              value: presentIds.size,
              icon: CalendarCheck,
              color: "bg-chart-4/20 text-chart-4",
            },
            {
              label: "Absent today",
              value: Math.max(0, activePupilsCount - presentIds.size),
              icon: GraduationCap,
              color: "bg-accent/15 text-accent",
            },
          ]
        : [],
    [isStaff, activePupilsCount, classes, presentIds.size],
  );

  const myClassPupils = useMemo(
    () => (pupils || []).filter((p) => p && p.classId === currentUser?.classId && p.active),
    [pupils, currentUser?.classId],
  );

  const teacherTotalCount = myClassPupils.length;

  const teacherPresentCount = useMemo(
    () =>
      myClassPupils.filter((p) => {
        const att = todayAttMap.get(p.id);
        return !!att?.arrival;
      }).length,
    [myClassPupils, todayAttMap],
  );

  const teacherAbsentCount = Math.max(0, teacherTotalCount - teacherPresentCount);

  const filteredTeacherPupils = useMemo(
    () =>
      myClassPupils.filter((p) => {
        const att = todayAttMap.get(p.id);
        const isPresent = !!att?.arrival;
        if (teacherFilter === "present") return isPresent;
        if (teacherFilter === "absent") return !isPresent;
        return true;
      }),
    [myClassPupils, todayAttMap, teacherFilter],
  );

  const userGreetingName = (currentUser?.name || "User").trim().split(" ")[0] || "User";

  if (loading && !currentUser) {
    return (
      <AppShell title="Dashboard">
        <div className="min-h-[50vh] flex flex-col items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading dashboard...</p>
        </div>
      </AppShell>
    );
  }

  if (!currentUser) return null;

  if (currentUser.role === "super_admin") {
    return (
      <SuperAdminDashboard
        schools={schools}
        users={users}
        pupils={pupils}
        classes={classes}
        audit={audit}
        subjects={subjects}
      />
    );
  }

  return (
    <AppShell title={`Hello, ${userGreetingName}`}>
      {isStaff ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.label} className="border-0 shadow-sm">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div
                      className={`h-12 w-12 rounded-2xl flex items-center justify-center ${s.color}`}
                    >
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
                    <div className="font-semibold">
                      {pending} teacher account{pending > 1 ? "s" : ""} awaiting approval
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Review pending registrations.
                    </div>
                  </div>
                </div>
                <Button asChild variant="default">
                  <Link to="/app/teachers">Review</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 mt-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent attendance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {todayAtt.slice(0, 6).map((a) => {
                  const p = pupils.find((x) => x.id === a.pupilId);
                  if (!p) return null;
                  return (
                    <div
                      key={a.id}
                      className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                    >
                      <span className="font-medium">
                        {p.firstName} {p.lastName}
                      </span>
                      <span className="text-muted-foreground">
                        {a.arrival ? `Arrived ${a.arrival}` : ""}{" "}
                        {a.departure ? `- Left ${a.departure}` : ""}
                      </span>
                    </div>
                  );
                })}
                {todayAtt.length === 0 && (
                  <p className="text-sm text-muted-foreground">No activity yet today.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification delivery</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {notifications.slice(0, 6).map((n) => {
                  const parent = parents.find((p) => p.id === n.parentId);
                  return (
                    <div
                      key={n.id}
                      className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="truncate block">{n.message}</span>
                        {n.phoneNumber && n.channel === "sms" && (
                          <span className="text-xs text-muted-foreground">To: {n.phoneNumber}</span>
                        )}
                        {n.channel === "email" && parent && (
                          <span className="text-xs text-muted-foreground">To: {parent.email}</span>
                        )}
                      </div>
                      <Badge
                        variant={n.status === "sent" ? "default" : "destructive"}
                        className="uppercase text-[10px] ml-2 shrink-0"
                      >
                        {n.channel} - {n.status}
                      </Badge>
                    </div>
                  );
                })}
                {notifications.length === 0 && (
                  <p className="text-sm text-muted-foreground">No notifications sent yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* School Teachers Directory Card for School Admins / Staff */}
          <Card className="mt-6">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 gap-2">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  School Teachers ({(users || []).filter((u) => u && u.role === "teacher").length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Teaching staff assigned to your school and their active classroom streams.
                </CardDescription>
              </div>
              <Button asChild size="sm" variant="outline" className="gap-1 text-xs">
                <Link to="/app/teachers">
                  Manage Teachers <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {(users || []).filter((u) => u && u.role === "teacher").length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(users || [])
                    .filter((u) => u && u.role === "teacher")
                    .slice(0, 6)
                    .map((teacher) => {
                      const assignedClass = classes.find((c) => c.id === teacher.classId)?.name;
                      const initials = (teacher.name || "T")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2);

                      return (
                        <div
                          key={teacher.id}
                          className="rounded-xl border p-3.5 bg-card hover:shadow-sm transition-all flex flex-col justify-between"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar className="h-9 w-9 border shrink-0">
                                {teacher.photo && (
                                  <AvatarImage src={teacher.photo} alt={teacher.name} />
                                )}
                                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="font-semibold text-sm truncate">{teacher.name}</div>
                                <div className="text-[11px] font-mono text-muted-foreground">
                                  {teacher.id}
                                </div>
                              </div>
                            </div>
                            <Badge
                              variant={
                                teacher.status === "verified" || !teacher.status
                                  ? "default"
                                  : teacher.status === "rejected"
                                    ? "destructive"
                                    : "secondary"
                              }
                              className="capitalize text-[10px] px-1.5 py-0 font-normal shrink-0"
                            >
                              {teacher.status || "Active"}
                            </Badge>
                          </div>

                          <div className="space-y-1.5 text-xs text-muted-foreground pt-2 border-t">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="truncate">
                                {assignedClass ? (
                                  <span className="font-medium text-foreground">
                                    {assignedClass}
                                  </span>
                                ) : (
                                  <span className="italic">No class assigned</span>
                                )}
                              </span>
                            </div>

                            {teacher.subjects && teacher.subjects.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                {teacher.subjects.slice(0, 3).map((sub) => (
                                  <Badge
                                    key={sub}
                                    variant="outline"
                                    className="text-[10px] py-0 px-1 font-normal bg-secondary/30"
                                  >
                                    {sub}
                                  </Badge>
                                ))}
                                {teacher.subjects.length > 3 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    +{teacher.subjects.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}

                            {teacher.phone && (
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span>{teacher.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground border rounded-xl bg-muted/20">
                  <GraduationCap className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="font-medium text-foreground">No teachers registered yet</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Add teaching staff to your school to begin assigning classes and recording
                    marks.
                  </p>
                  <Button asChild size="sm">
                    <Link to="/app/teachers">Add Teacher</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="space-y-6">
          {/* Teacher Attendance Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border shadow-sm bg-card hover:bg-accent/10 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Pupils</p>
                  <h3 className="text-2xl font-bold">{teacherTotalCount}</h3>
                </div>
                <div className="p-2 bg-primary/10 text-primary rounded-full">
                  <Users className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm bg-card hover:bg-accent/10 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Present Today</p>
                  <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {teacherPresentCount}
                  </h3>
                </div>
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full">
                  <CheckCircle className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm bg-card hover:bg-accent/10 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Absent Today</p>
                  <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                    {teacherAbsentCount}
                  </h3>
                </div>
                <div className="p-2 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-full">
                  <XCircle className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
              <div>
                <CardTitle className="text-xl font-bold">
                  My class: {classes.find((c) => c.id === currentUser.classId)?.name ?? "-"}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Record pupil arrival and departure. Timestamps are automatically captured.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">
                  Filter:
                </span>
                <Button
                  variant={teacherFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTeacherFilter("all")}
                  className="h-8 text-xs font-medium"
                >
                  All ({teacherTotalCount})
                </Button>
                <Button
                  variant={teacherFilter === "present" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTeacherFilter("present")}
                  className={`h-8 text-xs font-medium ${
                    teacherFilter === "present"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                  }`}
                >
                  Present ({teacherPresentCount})
                </Button>
                <Button
                  variant={teacherFilter === "absent" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTeacherFilter("absent")}
                  className={`h-8 text-xs font-medium ${
                    teacherFilter === "absent"
                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                      : "text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                  }`}
                >
                  Absent ({teacherAbsentCount})
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredTeacherPupils.map((p) => {
                  const att = todayAttMap.get(p.id);
                  const isPresent = !!att?.arrival;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl border p-3.5 bg-card hover:shadow-sm transition-all"
                    >
                      <div className="space-y-1">
                        <div className="font-semibold flex items-center gap-2">
                          <span>
                            {p.firstName} {p.lastName}
                          </span>
                          {isPresent ? (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 text-[10px] px-1.5 py-0">
                              Present
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 text-[10px] px-1.5 py-0"
                            >
                              Absent
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {att?.arrival ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>Arrived {att.arrival}</span>
                              {att.arrivalTransport && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-normal px-1.5 py-0"
                                >
                                  {att.arrivalTransport} ({att.arrivalPersonName || "Operator"})
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span>Not arrived</span>
                          )}
                          {att?.departure && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>Left {att.departure}</span>
                              {att.departureTransport && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-normal px-1.5 py-0 border-secondary"
                                >
                                  {att.departureTransport} ({att.departurePersonName || "Operator"})
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={!!att?.arrival}
                          onClick={() => openArrivalDialog(p)}
                        >
                          Arrival
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={!att?.arrival || !!att?.departure}
                          onClick={() => openDepartureDialog(p)}
                        >
                          Departure
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {filteredTeacherPupils.length === 0 && (
                  <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
                    No pupils found matching the "{teacherFilter}" filter.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Arrival Dialog */}
      <Dialog open={arrivalDialogOpen} onOpenChange={setArrivalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Mark Arrival - {selectedPupil?.firstName} {selectedPupil?.lastName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1">
              <div className="flex items-center justify-between font-medium">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" /> System Recorded Time:
                </span>
                <Badge variant="outline" className="font-mono text-xs font-semibold bg-background">
                  {new Date().toTimeString().slice(0, 5)}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1 border-t border-border/50">
                <Lock className="h-3 w-3 shrink-0" />
                Arrival time is automatically logged and cannot be edited.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="arrival-transport">Mode of Transport *</Label>
              <Select
                value={arrivalForm.transport}
                onValueChange={(v) => setArrivalForm({ ...arrivalForm, transport: v })}
              >
                <SelectTrigger id="arrival-transport">
                  <SelectValue placeholder="Select transport mode" />
                </SelectTrigger>
                <SelectContent>
                  {transportModes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="arrival-vehicle">Vehicle Registration Number</Label>
              <div className="flex gap-2">
                <Input
                  id="arrival-vehicle"
                  value={arrivalForm.vehicleReg}
                  onChange={(e) => setArrivalForm({ ...arrivalForm, vehicleReg: e.target.value })}
                  placeholder="e.g., KAA 123B"
                  disabled={arrivalForm.vehicleReg === "N/A"}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant={arrivalForm.vehicleReg === "N/A" ? "default" : "outline"}
                  onClick={() =>
                    setArrivalForm({
                      ...arrivalForm,
                      vehicleReg: arrivalForm.vehicleReg === "N/A" ? "" : "N/A",
                    })
                  }
                >
                  N/A
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Click N/A if no vehicle (e.g., walking)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="arrival-person">Operator Name / Person Bringing *</Label>
              <Input
                id="arrival-person"
                value={arrivalForm.personName}
                onChange={(e) => setArrivalForm({ ...arrivalForm, personName: e.target.value })}
                placeholder="e.g., Mary Atieno"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arrival-phone">Operator Phone Number *</Label>
              <Input
                id="arrival-phone"
                value={arrivalForm.phone}
                onChange={(e) => setArrivalForm({ ...arrivalForm, phone: e.target.value })}
                placeholder="e.g., +254 712 000 001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arrival-relation">Relationship *</Label>
              <Select
                value={arrivalForm.personRelation}
                onValueChange={(v) => setArrivalForm({ ...arrivalForm, personRelation: v })}
              >
                <SelectTrigger id="arrival-relation">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {relations.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArrivalDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleArrival}>Record Arrival</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Departure Dialog */}
      <Dialog open={departureDialogOpen} onOpenChange={setDepartureDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Mark Departure - {selectedPupil?.firstName} {selectedPupil?.lastName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1">
              <div className="flex items-center justify-between font-medium">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" /> System Recorded Time:
                </span>
                <Badge variant="outline" className="font-mono text-xs font-semibold bg-background">
                  {new Date().toTimeString().slice(0, 5)}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1 border-t border-border/50">
                <Lock className="h-3 w-3 shrink-0" />
                Departure time is automatically logged and cannot be edited.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="departure-transport">Mode of Transport *</Label>
              <Select
                value={departureForm.transport}
                onValueChange={(v) => setDepartureForm({ ...departureForm, transport: v })}
              >
                <SelectTrigger id="departure-transport">
                  <SelectValue placeholder="Select transport mode" />
                </SelectTrigger>
                <SelectContent>
                  {transportModes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="departure-vehicle">Vehicle Registration Number</Label>
              <div className="flex gap-2">
                <Input
                  id="departure-vehicle"
                  value={departureForm.vehicleReg}
                  onChange={(e) =>
                    setDepartureForm({ ...departureForm, vehicleReg: e.target.value })
                  }
                  placeholder="e.g., KBZ 456C"
                  disabled={departureForm.vehicleReg === "N/A"}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant={departureForm.vehicleReg === "N/A" ? "default" : "outline"}
                  onClick={() =>
                    setDepartureForm({
                      ...departureForm,
                      vehicleReg: departureForm.vehicleReg === "N/A" ? "" : "N/A",
                    })
                  }
                >
                  N/A
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Click N/A if no vehicle (e.g., walking)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="departure-person">Operator Name / Person Picking Up *</Label>
              <Input
                id="departure-person"
                value={departureForm.personName}
                onChange={(e) => setDepartureForm({ ...departureForm, personName: e.target.value })}
                placeholder="e.g., John Kamau"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="departure-phone">Operator Phone Number *</Label>
              <Input
                id="departure-phone"
                value={departureForm.phone}
                onChange={(e) => setDepartureForm({ ...departureForm, phone: e.target.value })}
                placeholder="e.g., +254 712 000 002"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="departure-relation">Relationship *</Label>
              <Select
                value={departureForm.personRelation}
                onValueChange={(v) => setDepartureForm({ ...departureForm, personRelation: v })}
              >
                <SelectTrigger id="departure-relation">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {relations.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepartureDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDeparture}>Record Departure</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function SuperAdminDashboard({
  schools = [],
  users = [],
  pupils = [],
  classes = [],
  audit = [],
  subjects = [],
}: any) {
  const totalTeachers = useMemo(
    () =>
      (users || []).filter((u: any) => u && u.role === "teacher" && u.status === "verified").length,
    [users],
  );
  const pendingTeachers = useMemo(
    () =>
      (users || []).filter((u: any) => u && u.role === "teacher" && u.status === "pending").length,
    [users],
  );
  const totalAdmins = useMemo(
    () =>
      (users || []).filter(
        (u: any) => u && (u.role === "admin" || u.role === "deputy") && u.status === "verified",
      ).length,
    [users],
  );
  const activePupils = useMemo(
    () => (pupils || []).filter((p: any) => p && p.active).length,
    [pupils],
  );

  const stats = useMemo(
    () => [
      {
        label: "Total Schools",
        value: (schools || []).length,
        icon: Building,
        color: "bg-blue-500/15 text-blue-600",
        link: "/app/schools",
      },
      {
        label: "System Users",
        value: (users || []).length,
        icon: ShieldCheck,
        color: "bg-purple-500/15 text-purple-600",
        link: "/app/teachers",
      },
      {
        label: "Active Pupils",
        value: activePupils,
        icon: Baby,
        color: "bg-green-500/15 text-green-600",
        link: "/app/pupils",
      },
      {
        label: "Total Classes",
        value: (classes || []).length,
        icon: GraduationCap,
        color: "bg-orange-500/15 text-orange-600",
        link: "/app/classes",
      },
    ],
    [schools, users, activePupils, classes],
  );

  const additionalStats = useMemo(
    () => [
      { label: "Admins/Deputies", value: totalAdmins },
      { label: "Verified Teachers", value: totalTeachers },
      { label: "Pending Approvals", value: pendingTeachers, highlight: pendingTeachers > 0 },
      { label: "Total Subjects", value: (subjects || []).length },
      { label: "System Logs", value: (audit || []).length },
    ],
    [totalAdmins, totalTeachers, pendingTeachers, subjects, audit],
  );

  return (
    <AppShell title="Super Admin Dashboard">
      <div className="space-y-6">
        {/* Main Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <Link to={s.link} key={s.label}>
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div
                      className={`h-14 w-14 rounded-2xl flex items-center justify-center ${s.color}`}
                    >
                      <Icon className="h-7 w-7" />
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{s.value}</div>
                      <div className="text-sm text-muted-foreground">{s.label}</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Secondary Stats Bar */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {additionalStats.map((s) => (
            <Card
              key={s.label}
              className={`border-0 shadow-sm ${s.highlight ? "bg-accent/10 border-accent/30" : ""}`}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <span className={`text-2xl font-semibold ${s.highlight ? "text-accent" : ""}`}>
                  {s.value}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        {pendingTeachers > 0 && (
          <Card className="border-accent/40 bg-accent/5">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BellRing className="h-5 w-5 text-accent" />
                <div>
                  <div className="font-semibold">
                    {pendingTeachers} teacher account{pendingTeachers > 1 ? "s" : ""} awaiting
                    approval
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Review and approve pending registrations.
                  </div>
                </div>
              </div>
              <Button asChild variant="default">
                <Link to="/app/teachers">Review Now</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Schools Overview Table */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Schools Overview</CardTitle>
              <Button asChild size="sm" variant="outline">
                <Link to="/app/schools">Manage All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School Name</TableHead>
                    <TableHead>Pupils</TableHead>
                    <TableHead>Classes</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(schools || []).map((s: any) => {
                    if (!s) return null;
                    const pupilsCount = (pupils || []).filter(
                      (p: any) => p && p.schoolId === s.id && p.active,
                    ).length;
                    const classesCount = (classes || []).filter(
                      (c: any) => c && c.schoolId === s.id,
                    ).length;
                    const staffCount = (users || []).filter(
                      (u: any) => u && u.schoolId === s.id && u.status === "verified",
                    ).length;
                    const status = pupilsCount > 0 ? "Active" : "New";
                    return (
                      <TableRow key={s.id || Math.random().toString()}>
                        <TableCell className="font-semibold">
                          {s.name || "Unnamed School"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{pupilsCount}</TableCell>
                        <TableCell className="text-muted-foreground">{classesCount}</TableCell>
                        <TableCell className="text-muted-foreground">{staffCount}</TableCell>
                        <TableCell>
                          <Badge
                            variant={status === "Active" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(schools || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No schools registered yet.{" "}
                        <Link to="/app/schools" className="text-primary underline">
                          Create your first school
                        </Link>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent System Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Recent Activity</CardTitle>
              <Button asChild size="sm" variant="ghost">
                <Link to="/app/audit">View All</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {(audit || []).slice(0, 8).map((a: any) => {
                if (!a) return null;
                const timestamp = a?.timestamp ? new Date(a.timestamp) : new Date();
                const isValidDate = !isNaN(timestamp.getTime());
                const isToday =
                  isValidDate && timestamp.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={a.id || Math.random().toString()}
                    className="text-sm pb-3 border-b last:border-0 last:pb-0"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-xs truncate max-w-[140px]">
                        {a.actorName || "System"}
                      </span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                        {isValidDate
                          ? isToday
                            ? timestamp.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : timestamp.toLocaleDateString([], { month: "short", day: "numeric" })
                          : "Recently"}
                      </span>
                    </div>
                    <div className="text-muted-foreground text-xs leading-relaxed">
                      <span className="text-foreground font-medium">{a.action || "Action"}</span>
                      {a.target && (
                        <>
                          <br />
                          <span className="text-[11px]">{a.target}</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {(audit || []).length === 0 && (
                <p className="text-xs text-center text-muted-foreground py-4">
                  No system activity yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Access Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Link to="/app/schools">
                <Card className="border hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/15 text-blue-600 flex items-center justify-center">
                      <Building className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">Manage Schools</div>
                      <div className="text-xs text-muted-foreground">Add, edit, or remove</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link to="/app/users">
                <Card className="border hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-500/15 text-purple-600 flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">User Accounts</div>
                      <div className="text-xs text-muted-foreground">Manage all users</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link to="/app/classes">
                <Card className="border hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-orange-500/15 text-orange-600 flex items-center justify-center">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">All Classes</div>
                      <div className="text-xs text-muted-foreground">View across schools</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link to="/app/subjects">
                <Card className="border hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-teal-500/15 text-teal-600 flex items-center justify-center">
                      <BookMarked className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">School Subjects</div>
                      <div className="text-xs text-muted-foreground">Curriculum subjects</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link to="/app/audit">
                <Card className="border hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-500/15 text-green-600 flex items-center justify-center">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">Audit Logs</div>
                      <div className="text-xs text-muted-foreground">System activity</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
