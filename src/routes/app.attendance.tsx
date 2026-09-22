import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Car, Info, Calendar, Users, CheckCircle, XCircle, Clock, Lock, Download, TrendingUp, AlertTriangle, BarChart3, FileText, UserCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { format, subDays, isToday, parseISO } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/app/attendance")({
  head: () => ({ meta: [{ title: "Attendance - Noble Edu" }] }),
  component: AttendancePage,
});

function AttendancePage() {
  const {
    currentUser,
    pupils = [],
    classes = [],
    attendance = [],
    markArrival,
    markDeparture,
    schools = [],
    parents = [],
    loading = false,
  } = useStore();
  const today = new Date().toISOString().slice(0, 10);
  const isTeacher = currentUser?.role === "teacher";

  // Enhanced attendance analytics
  const getAttendanceHistory = (pupilId: string, days: number = 7) => {
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    return attendance.filter(att => 
      att.pupilId === pupilId && 
      new Date(att.date) >= startDate && 
      new Date(att.date) <= endDate
    );
  };

  const calculateAttendanceRate = (pupilId: string, days: number = 7) => {
    const history = getAttendanceHistory(pupilId, days);
    const presentDays = history.filter(att => att.arrival).length;
    return days > 0 ? Math.round((presentDays / days) * 100) : 0;
  };

  const exportAttendanceData = () => {
    const attendanceData = displayedPupils.map(p => {
      const att = dayAtt.find(a => a.pupilId === p.id);
      const rate7Days = calculateAttendanceRate(p.id, 7);
      return [
        p.firstName + " " + p.lastName,
        p.admissionNo,
        classes.find(c => c.id === p.classId)?.name || "-",
        att?.arrival || "Absent",
        att?.departure || "-",
        att?.arrivalTransport || "-",
        att?.departureTransport || "-",
        att?.arrivalPersonName || "-",
        att?.departurePersonName || "-",
        rate7Days + "%"
      ];
    });

    const csvContent = [
      ["Pupil Name", "Admission No", "Class", "Arrival Time", "Departure Time", "Arrival Transport", "Departure Transport", "Brought By", "Picked By", "7-Day Rate"],
      ...attendanceData
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_${date}_${classes.find(c => c.id === classId)?.name || 'class'}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Attendance data exported successfully");
  };

  const markAllPresent = () => {
    const absentPupils = classPupils.filter(p => !dayAtt.find(a => a.pupilId === p.id)?.arrival);
    
    if (absentPupils.length === 0) {
      toast.info("All pupils are already marked as present");
      return;
    }

    absentPupils.forEach(pupil => markArrival(pupil.id));
    toast.success(`Marked ${absentPupils.length} pupils as present`);
  };

  // Super Admin School filtering
  const [superSchoolId, setSuperSchoolId] = useState<string>(schools?.[0]?.id ?? "");

  const filteredClasses = useMemo(() => {
    if (currentUser?.role === "super_admin") {
      return (classes || []).filter((c) => c?.schoolId === superSchoolId);
    }
    if (currentUser?.schoolId) {
      return (classes || []).filter((c) => c?.schoolId === currentUser?.schoolId);
    }
    return classes || [];
  }, [classes, currentUser, superSchoolId]);

  const [classId, setClassId] = useState<string>("");

  useEffect(() => {
    if (filteredClasses.length > 0) {
      const defaultClass = isTeacher
        ? (currentUser?.classId ?? filteredClasses[0]?.id)
        : filteredClasses[0]?.id;
      setClassId((curr) => {
        // If current class isn't in new list, reset to default
        if (!curr || !filteredClasses.some((c) => c.id === curr)) {
          return defaultClass ?? "";
        }
        return curr;
      });
    } else {
      setClassId("");
    }
  }, [filteredClasses, currentUser, isTeacher]);
  const [date, setDate] = useState(today);
  const [filter, setFilter] = useState<"all" | "present" | "absent">("all");
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

  const classPupils = pupils.filter((p) => p.classId === classId && p.active);
  const dayAtt = attendance.filter((a) => a.date === date);

  // Enhanced Statistics
  const totalCount = classPupils.length;
  const presentCount = useMemo(() => {
    return classPupils.filter((p) => {
      const att = dayAtt.find((a) => a.pupilId === p.id);
      return !!att?.arrival;
    }).length;
  }, [classPupils, dayAtt]);
  const absentCount = totalCount - presentCount;
  
  // Calculate attendance rate for the class over the last 7 days
  const classAttendanceRate = useMemo(() => {
    if (totalCount === 0) return 0;
    const last7Days = Array.from({length: 7}, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().slice(0, 10);
    });
    
    const totalPossibleAttendance = totalCount * 7;
    const actualAttendance = last7Days.reduce((total, dateStr) => {
      return total + attendance.filter(att => 
        att.date === dateStr && 
        classPupils.some(p => p.id === att.pupilId) && 
        att.arrival
      ).length;
    }, 0);
    
    return Math.round((actualAttendance / totalPossibleAttendance) * 100);
  }, [classPupils, attendance, totalCount]);

  // Get pupils with attendance concerns (less than 80% in last 7 days)
  const concernPupils = useMemo(() => {
    return classPupils.filter(p => calculateAttendanceRate(p.id, 7) < 80);
  }, [classPupils]);

  // Count departed pupils
  const departedCount = useMemo(() => {
    return classPupils.filter((p) => {
      const att = dayAtt.find((a) => a.pupilId === p.id);
      return !!att?.departure;
    }).length;
  }, [classPupils, dayAtt]);

  // Filtered pupils list
  const displayedPupils = useMemo(() => {
    return classPupils.filter((p) => {
      const att = dayAtt.find((a) => a.pupilId === p.id);
      const isPresent = !!att?.arrival;
      if (filter === "present") return isPresent;
      if (filter === "absent") return !isPresent;
      return true;
    });
  }, [classPupils, dayAtt, filter]);

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

  const handleQuickArrival = (pupil: any) => {
    markArrival(pupil.id);
    toast.success(`Arrival logged for ${pupil.firstName} ${pupil.lastName} - parents notified`);
  };

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

    toast.success(`Arrival logged - parents notified`);
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

    toast.success(`Departure logged - parents notified`);
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

  const handleQuickDeparture = (pupil: any) => {
    markDeparture(pupil.id);
    toast.success(`Departure logged for ${pupil.firstName} ${pupil.lastName} - parents notified`);
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

  if (loading && !currentUser) {
    return (
      <AppShell title="Attendance">
        <div className="min-h-[50vh] flex flex-col items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading attendance...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Attendance">
      {/* Enhanced Attendance Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="border shadow-sm bg-card hover:bg-accent/10 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Pupils</p>
              <h3 className="text-2xl font-bold">{totalCount}</h3>
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
                {presentCount}
              </h3>
              <p className="text-xs text-muted-foreground">
                {totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0}% of class
              </p>
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
              <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400">{absentCount}</h3>
              <p className="text-xs text-muted-foreground">
                {totalCount > 0 ? Math.round((absentCount / totalCount) * 100) : 0}% of class
              </p>
            </div>
            <div className="p-2 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-full">
              <XCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card hover:bg-accent/10 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Departed</p>
              <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400">{departedCount}</h3>
              <p className="text-xs text-muted-foreground">
                Gone home today
              </p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-full">
              <UserCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-card hover:bg-accent/10 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">7-Day Rate</p>
              <h3 className={`text-2xl font-bold ${classAttendanceRate >= 90 ? 'text-emerald-600' : classAttendanceRate >= 80 ? 'text-amber-600' : 'text-rose-600'}`}>
                {classAttendanceRate}%
              </h3>
              <p className="text-xs text-muted-foreground">
                Class average
              </p>
            </div>
            <div className={`p-2 rounded-full ${classAttendanceRate >= 90 ? 'bg-emerald-100 text-emerald-600' : classAttendanceRate >= 80 ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'}`}>
              <TrendingUp className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Concerns Alert */}
      {concernPupils.length > 0 && (
        <Card className="border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/10 mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-amber-800 dark:text-amber-200">Attendance Concerns</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  {concernPupils.length} pupil{concernPupils.length > 1 ? 's have' : ' has'} attendance below 80% in the last 7 days:
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {concernPupils.slice(0, 5).map(pupil => (
                    <Badge key={pupil.id} variant="outline" className="text-amber-800 border-amber-300">
                      {pupil.firstName} {pupil.lastName} ({calculateAttendanceRate(pupil.id, 7)}%)
                    </Badge>
                  ))}
                  {concernPupils.length > 5 && (
                    <Badge variant="outline" className="text-amber-800 border-amber-300">
                      +{concernPupils.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-wrap gap-3 mb-6 items-center justify-between border-b pb-4">
            <div className="flex flex-wrap gap-3 items-center">
              {currentUser?.role === "super_admin" && (
                <select
                  value={superSchoolId}
                  onChange={(e) => setSuperSchoolId(e.target.value)}
                  className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring file:border-0 file:bg-transparent file:text-sm file:font-medium md:text-sm"
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              <Select value={classId} onValueChange={setClassId} disabled={isTeacher}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filteredClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <label htmlFor="date-search" className="text-sm font-medium">
                  Search Date:
                </label>
                <input
                  id="date-search"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {date !== today && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDate(today);
                      toast.success("Reset to today's date");
                    }}
                    className="flex items-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Reset to Today
                  </Button>
                )}
              </div>
            </div>

            </div>
            
            {/* Quick Filters */}
            <div className="flex items-center gap-2 mt-3 lg:mt-0">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">
                Filter:
              </span>
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
                className="h-8 text-xs font-medium"
              >
                All ({totalCount})
              </Button>
              <Button
                variant={filter === "present" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("present")}
                className={`h-8 text-xs font-medium ${
                  filter === "present"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                }`}
              >
                Present ({presentCount})
              </Button>
              <Button
                variant={filter === "absent" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("absent")}
                className={`h-8 text-xs font-medium ${
                  filter === "absent"
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : "text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                }`}
              >
                Absent ({absentCount})
              </Button>

              {/* Quick Actions and Export */}
              <div className="flex items-center gap-2 ml-4 pl-4 border-l">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={exportAttendanceData}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Export</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Export attendance data to CSV</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {isToday(new Date(date)) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Quick Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={markAllPresent} disabled={absentCount === 0}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark All Present ({absentCount} pupils)
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => toast.info("Feature coming soon!")}>
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Report
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pupil</TableHead>
                <TableHead>7-Day Rate</TableHead>
                <TableHead>Arrival</TableHead>
                <TableHead>Transport In</TableHead>
                <TableHead>Departure</TableHead>
                <TableHead>Transport Out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedPupils.map((p) => {
                const att = dayAtt.find((a) => a.pupilId === p.id);
                const isToday = date === today;
                const rate7Days = calculateAttendanceRate(p.id, 7);
                const rateColor = rate7Days >= 90 ? 'text-emerald-600' : rate7Days >= 80 ? 'text-amber-600' : 'text-rose-600';
                
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{p.firstName} {p.lastName}</span>
                        {rate7Days < 80 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Attendance concern: {rate7Days}% in last 7 days</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-medium ${rateColor}`}>
                        {rate7Days}%
                      </Badge>
                    </TableCell>
                    <TableCell>{att?.arrival ?? "-"}</TableCell>
                    <TableCell>
                      {att?.arrivalTransport ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 cursor-help">
                                <Car className="h-3 w-3" />
                                <span className="text-sm">{att.arrivalTransport}</span>
                                <Info className="h-3 w-3 text-muted-foreground" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <div className="space-y-1 text-sm">
                                <p>
                                  <strong>Transport:</strong> {att.arrivalTransport}
                                </p>
                                {att.arrivalVehicleReg && (
                                  <p>
                                    <strong>Vehicle:</strong> {att.arrivalVehicleReg}
                                  </p>
                                )}
                                <p>
                                  <strong>Brought by:</strong> {att.arrivalPersonName} (
                                  {att.arrivalPersonRelation})
                                </p>
                                {att.arrivalPhone && (
                                  <p>
                                    <strong>Phone:</strong> {att.arrivalPhone}
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{att?.departure ?? "-"}</TableCell>
                    <TableCell>
                      {att?.departureTransport ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 cursor-help">
                                <Car className="h-3 w-3" />
                                <span className="text-sm">{att.departureTransport}</span>
                                <Info className="h-3 w-3 text-muted-foreground" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <div className="space-y-1 text-sm">
                                <p>
                                  <strong>Transport:</strong> {att.departureTransport}
                                </p>
                                {att.departureVehicleReg && (
                                  <p>
                                    <strong>Vehicle:</strong> {att.departureVehicleReg}
                                  </p>
                                )}
                                <p>
                                  <strong>Picked by:</strong> {att.departurePersonName} (
                                  {att.departurePersonRelation})
                                </p>
                                {att.departurePhone && (
                                  <p>
                                    <strong>Phone:</strong> {att.departurePhone}
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {att?.arrival ? (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 hover:bg-emerald-200">
                          Present
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 hover:bg-rose-200"
                        >
                          Absent
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        disabled={!isToday || !!att?.arrival}
                        onClick={() => openArrivalDialog(p)}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-medium disabled:opacity-50"
                      >
                        Arrival
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!isToday || !att?.arrival || !!att?.departure}
                        onClick={() => openDepartureDialog(p)}
                        className="disabled:opacity-50"
                      >
                        Departure
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {displayedPupils.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No pupils found</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {totalCount === 0 
                          ? "No pupils in this class" 
                          : `No pupils found matching the "${filter}" filter.`
                        }
                      </p>
                      {totalCount === 0 && (
                        <Button variant="outline" onClick={() => {/* Navigate to pupils */}}>
                          Add Pupils to Class
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
