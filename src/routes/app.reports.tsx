import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Printer,
  Settings,
  RotateCcw,
  Check,
  Building2,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo, useEffect } from "react";
import { downloadCSV } from "@/lib/export-utils";

export const Route = createFileRoute("/app/reports")({
  head: () => ({ meta: [{ title: "Reports - Noble Edu" }] }),
  component: ReportsPage,
});

interface ReportFormatConfig {
  headerTitle: string;
  subtitle: string;
  schoolAddress: string;
  showAttendance: boolean;
  showTeacherComments: boolean;
  showPrincipalSignature: boolean;
  principalTitle: string;
  showClassRank: boolean;
  showStampBox: boolean;
  footerRemarks: string;
}

const DEFAULT_REPORT_FORMAT: ReportFormatConfig = {
  headerTitle: "Noble Edu",
  subtitle: "Academic Performance Report Card",
  schoolAddress: "P.O. Box 1234, Kampala, Uganda | Tel: +256 700 000 000 | info@nobleedu.com",
  showAttendance: false,
  showTeacherComments: true,
  showPrincipalSignature: true,
  principalTitle: "Headteacher's Signature & Date",
  showClassRank: true,
  showStampBox: true,
  footerRemarks:
    "Next term begins on Monday, 15th September. All school fees must be cleared by the first week of term.",
};

function ReportsPage() {
  const {
    currentUser,
    students = [],
    attendance = [],
    classes = [],
    marks = [],
    schools = [],
    getSchoolSubjects,
    loading = false,
  } = useStore();
  const isAdmin = currentUser?.role === "super_admin" || currentUser?.role === "admin";
  const today = new Date().toISOString().slice(0, 10);
  const todayAtt = (attendance || []).filter((a) => a?.date === today);

  // Report Format Customization State
  const [formatConfig, setFormatConfig] = useState<ReportFormatConfig>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved =
          localStorage.getItem("noble_report_format_config") ||
          localStorage.getItem("kindy_report_format_config");
        if (saved) return { ...DEFAULT_REPORT_FORMAT, ...JSON.parse(saved) };
      } catch {
        /* ignore localStorage error */
      }
    }
    return DEFAULT_REPORT_FORMAT;
  });

  const [formatDialogOpen, setFormatDialogOpen] = useState(false);
  const [editFormat, setEditFormat] = useState<ReportFormatConfig>(formatConfig);

  const handleSaveFormat = () => {
    setFormatConfig(editFormat);
    try {
      localStorage.setItem("noble_report_format_config", JSON.stringify(editFormat));
    } catch {
      /* ignore localStorage error */
    }
    toast.success("Report format settings saved successfully!");
    setFormatDialogOpen(false);
  };

  const handleResetFormat = () => {
    setEditFormat(DEFAULT_REPORT_FORMAT);
    setFormatConfig(DEFAULT_REPORT_FORMAT);
    try {
      localStorage.removeItem("noble_report_format_config");
      localStorage.removeItem("kindy_report_format_config");
    } catch {
      /* ignore localStorage error */
    }
    toast.success("Reset report format to default settings");
    setFormatDialogOpen(false);
  };

  // Super Admin School filtering
  const [superSchoolId, setSuperSchoolId] = useState<string>(schools?.[0]?.id ?? "");

  const filteredClasses = useMemo(() => {
    if (currentUser?.role === "super_admin") {
      return classes.filter((c) => c.schoolId === superSchoolId);
    }
    if (currentUser?.schoolId) {
      return classes.filter((c) => c.schoolId === currentUser.schoolId);
    }
    return classes;
  }, [classes, currentUser, superSchoolId]);

  const [selectedClass, setSelectedClass] = useState<string>("");

  useEffect(() => {
    if (filteredClasses.length > 0) {
      setSelectedClass((curr) => {
        if (!curr || !filteredClasses.some((c) => c.id === curr)) {
          return filteredClasses[0]?.id ?? "";
        }
        return curr;
      });
    } else {
      setSelectedClass("");
    }
  }, [filteredClasses]);

  const [selectedTerm, setSelectedTerm] = useState("Term 2");
  const [selectedYear, setSelectedYear] = useState("2025");
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewStudent, setPreviewStudent] = useState<any>(null);
  const [marksSheetOpen, setMarksSheetOpen] = useState(false);
  const [sheetDisplayMode, setSheetDisplayMode] = useState<"score" | "percentage" | "grade">(
    "score",
  );

  const currentClassObj = classes.find((c) => c.id === selectedClass);
  const currentSchoolObj = schools.find(
    (s) => s.id === (currentClassObj?.schoolId || currentUser?.schoolId),
  );
  const reportSchoolId =
    currentUser?.role === "super_admin"
      ? superSchoolId
      : currentClassObj?.schoolId || currentUser?.schoolId;
  const rawReportSubjects = getSchoolSubjects(reportSchoolId);
  const subjects = useMemo(() => rawReportSubjects.map((s) => s.name), [rawReportSubjects]);
  const selectedClassStudents = students.filter((p) => p.classId === selectedClass && p.active);

  const broadsheetData = useMemo(() => {
    return selectedClassStudents.map((p) => {
      const studentMarks = marks.filter(
        (m) => m.studentId === p.id && m.term === selectedTerm && m.year === selectedYear,
      );

      let totalPct = 0;
      let count = 0;

      const subjectMarks: Record<
        string,
        { score: number; maxScore: number; grade?: string; pct: number } | null
      > = {};

      subjects.forEach((subj) => {
        const m = studentMarks.find((x) => x.subject === subj);
        if (m) {
          const pct = (m.score / m.maxScore) * 100;
          subjectMarks[subj] = { score: m.score, maxScore: m.maxScore, grade: m.grade, pct };
          totalPct += pct;
          count += 1;
        } else {
          subjectMarks[subj] = null;
        }
      });

      const avgPct = count > 0 ? totalPct / count : null;
      let overallGrade = "N/A";
      if (avgPct !== null) {
        if (avgPct >= 90) overallGrade = "A";
        else if (avgPct >= 80) overallGrade = "B";
        else if (avgPct >= 70) overallGrade = "C";
        else if (avgPct >= 60) overallGrade = "D";
        else overallGrade = "E";
      }

      return {
        student: p,
        subjectMarks,
        avgPct,
        overallGrade,
      };
    });
  }, [selectedClassStudents, marks, selectedTerm, selectedYear, subjects]);

  const lateThreshold = "08:00";
  const late = todayAtt.filter((a) => a.arrival && a.arrival > lateThreshold);

  const weeklySummary = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const cutoff = d.toISOString().slice(0, 10);
    const recent = attendance.filter((a) => a.date >= cutoff);

    return students.map((p) => {
      const pRecs = recent.filter((a) => a.studentId === p.id);
      const daysPresent = pRecs.length;
      const lateDays = pRecs.filter((a) => a.arrival && a.arrival > lateThreshold).length;
      const clsName = classes.find((c) => c.id === p.classId)?.name || "-";
      return { student: p, className: clsName, daysPresent, lateDays };
    });
  }, [attendance, students, classes, lateThreshold]);

  const monthlySummary = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const cutoff = d.toISOString().slice(0, 10);
    const recent = attendance.filter((a) => a.date >= cutoff);

    return students.map((p) => {
      const pRecs = recent.filter((a) => a.studentId === p.id);
      const daysPresent = pRecs.length;
      const lateDays = pRecs.filter((a) => a.arrival && a.arrival > lateThreshold).length;
      const clsName = classes.find((c) => c.id === p.classId)?.name || "-";
      return { student: p, className: clsName, daysPresent, lateDays };
    });
  }, [attendance, students, classes, lateThreshold]);

  const handleExportDailyPDF = () => {
    window.print();
    toast.success("Daily attendance report sent to print / PDF");
  };

  const handleExportDailyCSV = () => {
    const headers = ["Admission No", "Student Name", "Class", "Arrival Time", "Departure Time"];
    const rows = todayAtt.map((a) => {
      const p = students.find((x) => x.id === a.studentId);
      return [
        p?.admissionNo || "-",
        p ? `${p.firstName} ${p.lastName}` : "Unknown",
        classes.find((c) => c.id === p?.classId)?.name || "-",
        a.arrival ?? "-",
        a.departure ?? "-",
      ];
    });
    downloadCSV(`Daily_Attendance_${today}`, headers, rows);
    toast.success("Exported Daily Attendance to CSV / Excel");
  };

  const handleExportWeeklyPDF = () => {
    window.print();
    toast.success("Weekly attendance report sent to print / PDF");
  };

  const handleExportWeeklyCSV = () => {
    const headers = [
      "Admission No",
      "Student Name",
      "Class",
      "Days Present (Last 7 Days)",
      "Late Arrivals",
    ];
    const rows = weeklySummary.map((item) => [
      item.student.admissionNo,
      `${item.student.firstName} ${item.student.lastName}`,
      item.className,
      item.daysPresent,
      item.lateDays,
    ]);
    downloadCSV(`Weekly_Attendance_Report_${today}`, headers, rows);
    toast.success("Exported Weekly Attendance to CSV / Excel");
  };

  const handleExportMonthlyPDF = () => {
    window.print();
    toast.success("Monthly attendance report sent to print / PDF");
  };

  const handleExportMonthlyCSV = () => {
    const headers = [
      "Admission No",
      "Student Name",
      "Class",
      "Days Present (Last 30 Days)",
      "Late Arrivals",
    ];
    const rows = monthlySummary.map((item) => [
      item.student.admissionNo,
      `${item.student.firstName} ${item.student.lastName}`,
      item.className,
      item.daysPresent,
      item.lateDays,
    ]);
    downloadCSV(`Monthly_Attendance_Report_${today}`, headers, rows);
    toast.success("Exported Monthly Attendance to CSV / Excel");
  };

  const handleExportLatePDF = () => {
    window.print();
    toast.success("Late arrivals report sent to print / PDF");
  };

  const handleExportLateCSV = () => {
    const headers = ["Admission No", "Student Name", "Class", "Arrival Time"];
    const rows = late.map((a) => {
      const p = students.find((x) => x.id === a.studentId);
      return [
        p?.admissionNo || "-",
        p ? `${p.firstName} ${p.lastName}` : "Unknown",
        classes.find((c) => c.id === p?.classId)?.name || "-",
        a.arrival,
      ];
    });
    downloadCSV(`Late_Arrivals_${today}`, headers, rows);
    toast.success("Exported Late Arrivals report to CSV / Excel");
  };

  const terms = ["Term 1", "Term 2", "Term 3"];

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A":
        return "bg-green-500";
      case "B":
        return "bg-blue-500";
      case "C":
        return "bg-yellow-500";
      case "D":
        return "bg-orange-500";
      case "E":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const calculateAverage = (studentId: string) => {
    const studentMarks = marks.filter(
      (m) => m.studentId === studentId && m.term === selectedTerm && m.year === selectedYear,
    );
    if (studentMarks.length === 0) return null;

    const totalPercentage = studentMarks.reduce((sum, m) => sum + (m.score / m.maxScore) * 100, 0);
    return totalPercentage / studentMarks.length;
  };

  const getOverallGrade = (average: number | null) => {
    if (average === null) return "N/A";
    if (average >= 90) return "A";
    if (average >= 80) return "B";
    if (average >= 70) return "C";
    if (average >= 60) return "D";
    return "E";
  };

  // Helper to calculate Class Rank for a student
  const getStudentClassRank = (studentId: string) => {
    const classStudentsWithAvg = selectedClassStudents
      .map((p) => ({ id: p.id, avg: calculateAverage(p.id) }))
      .filter((x) => x.avg !== null)
      .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));

    const rankIdx = classStudentsWithAvg.findIndex((x) => x.id === studentId);
    if (rankIdx === -1) return "N/A";
    return `#${rankIdx + 1} of ${classStudentsWithAvg.length}`;
  };

  const generateReportCard = (studentId: string) => {
    const student = students.find((p) => p.id === studentId);
    if (!student) return;

    const studentMarks = marks.filter(
      (m) => m.studentId === studentId && m.term === selectedTerm && m.year === selectedYear,
    );

    if (studentMarks.length === 0) {
      toast.error(`No marks found for ${student.firstName} ${student.lastName}`);
      return;
    }

    setPreviewStudent({ ...student, marks: studentMarks });
    setPreviewDialogOpen(true);
  };

  const generateAllReportCards = () => {
    const classStudents = students.filter((p) => p.classId === selectedClass && p.active);
    const studentsWithMarks = classStudents.filter((p) => {
      const studentMarks = marks.filter(
        (m) => m.studentId === p.id && m.term === selectedTerm && m.year === selectedYear,
      );
      return studentMarks.length > 0;
    });

    if (studentsWithMarks.length === 0) {
      toast.error("No students with marks in this class for the selected term");
      return;
    }

    const first = studentsWithMarks[0];
    const firstMarks = marks.filter(
      (m) => m.studentId === first.id && m.term === selectedTerm && m.year === selectedYear,
    );
    setPreviewStudent({ ...first, marks: firstMarks });
    setPreviewDialogOpen(true);
    toast.success(
      `Generated ${studentsWithMarks.length} report cards ready for review and printing`,
    );
  };

  const downloadReportCard = () => {
    window.print();
    toast.success(
      `Report card for ${previewStudent?.firstName || "student"} sent to print / PDF download`,
    );
    setPreviewDialogOpen(false);
  };

  if (loading && !currentUser) {
    return (
      <AppShell title="Reports">
        <div className="min-h-[50vh] flex flex-col items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading reports...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Reports">
      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="late">Late arrivals</TabsTrigger>
          <TabsTrigger value="report-cards">Report Cards</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Today - {today}</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleExportDailyPDF}>
                  <FileText className="h-4 w-4 mr-1" />
                  PDF
                </Button>
                <Button size="sm" variant="outline" onClick={handleExportDailyCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Arrival</TableHead>
                    <TableHead>Departure</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayAtt.map((a) => {
                    const p = students.find((x) => x.id === a.studentId);
                    if (!p) return null;
                    return (
                      <TableRow key={a.id}>
                        <TableCell>
                          {p.firstName} {p.lastName}
                        </TableCell>
                        <TableCell>{classes.find((c) => c.id === p.classId)?.name}</TableCell>
                        <TableCell>{a.arrival ?? "-"}</TableCell>
                        <TableCell>{a.departure ?? "-"}</TableCell>
                      </TableRow>
                    );
                  })}
                  {todayAtt.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        No attendance records for today
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Weekly Attendance Summary (Last 7 Days)</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleExportWeeklyPDF}>
                  <FileText className="h-4 w-4 mr-1" />
                  PDF
                </Button>
                <Button size="sm" variant="outline" onClick={handleExportWeeklyCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    {isAdmin && <TableHead>Admission No</TableHead>}
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Days Present</TableHead>
                    <TableHead>Late Arrivals</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weeklySummary.map((item) => (
                    <TableRow key={item.student.id}>
                      {isAdmin && (
                        <TableCell className="font-mono text-xs">
                          {item.student.admissionNo}
                        </TableCell>
                      )}
                      <TableCell>
                        {item.student.firstName} {item.student.lastName}
                      </TableCell>
                      <TableCell>{item.className}</TableCell>
                      <TableCell>{item.daysPresent}</TableCell>
                      <TableCell>{item.lateDays}</TableCell>
                    </TableRow>
                  ))}
                  {weeklySummary.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={isAdmin ? 5 : 4}
                        className="text-center py-6 text-muted-foreground"
                      >
                        No students found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Monthly Attendance Summary (Last 30 Days)</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleExportMonthlyPDF}>
                  <FileText className="h-4 w-4 mr-1" />
                  PDF
                </Button>
                <Button size="sm" variant="outline" onClick={handleExportMonthlyCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    {isAdmin && <TableHead>Admission No</TableHead>}
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Days Present</TableHead>
                    <TableHead>Late Arrivals</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlySummary.map((item) => (
                    <TableRow key={item.student.id}>
                      {isAdmin && (
                        <TableCell className="font-mono text-xs">
                          {item.student.admissionNo}
                        </TableCell>
                      )}
                      <TableCell>
                        {item.student.firstName} {item.student.lastName}
                      </TableCell>
                      <TableCell>{item.className}</TableCell>
                      <TableCell>{item.daysPresent}</TableCell>
                      <TableCell>{item.lateDays}</TableCell>
                    </TableRow>
                  ))}
                  {monthlySummary.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={isAdmin ? 5 : 4}
                        className="text-center py-6 text-muted-foreground"
                      >
                        No students found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="late" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Late arrivals (after {lateThreshold})</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleExportLatePDF}>
                  <FileText className="h-4 w-4 mr-1" />
                  PDF
                </Button>
                <Button size="sm" variant="outline" onClick={handleExportLateCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Arrival</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {late.map((a) => {
                    const p = students.find((x) => x.id === a.studentId);
                    if (!p) return null;
                    return (
                      <TableRow key={a.id}>
                        <TableCell>
                          {p.firstName} {p.lastName}
                        </TableCell>
                        <TableCell>{a.arrival}</TableCell>
                      </TableRow>
                    );
                  })}
                  {late.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-6 text-muted-foreground">
                        No late arrivals today
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report-cards" className="mt-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Generate Report Cards
                </CardTitle>
                <CardDescription>
                  Generate academic report cards for students based on their marks
                </CardDescription>
              </div>
              {isAdmin && (
                <Button
                  variant="outline"
                  className="print:hidden"
                  onClick={() => {
                    setEditFormat(formatConfig);
                    setFormatDialogOpen(true);
                  }}
                >
                  <Settings className="h-4 w-4 mr-2 print:hidden" />
                  Edit Report Format
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3 items-end">
                  {currentUser?.role === "super_admin" && (
                    <div className="space-y-2">
                      <Label>School</Label>
                      <select
                        value={superSchoolId}
                        onChange={(e) => setSuperSchoolId(e.target.value)}
                        className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                      >
                        {schools.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select Class" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredClasses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Term</Label>
                    <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {terms.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2026">2026</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={generateAllReportCards}>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate All Report Cards
                  </Button>
                  <Button variant="outline" onClick={() => setMarksSheetOpen(true)}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Preview Marks Sheet
                  </Button>
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {isAdmin && <TableHead>Admission No</TableHead>}
                        <TableHead>Student Name</TableHead>
                        <TableHead>Subjects</TableHead>
                        <TableHead>Average</TableHead>
                        <TableHead>Overall Grade</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students
                        .filter((p) => p.classId === selectedClass && p.active)
                        .map((p) => {
                          const studentMarks = marks.filter(
                            (m) =>
                              m.studentId === p.id &&
                              m.term === selectedTerm &&
                              m.year === selectedYear,
                          );
                          const average = calculateAverage(p.id);
                          const overallGrade = getOverallGrade(average);

                          return (
                            <TableRow key={p.id}>
                              {isAdmin && <TableCell>{p.admissionNo}</TableCell>}
                              <TableCell className="font-medium">
                                {p.firstName} {p.lastName}
                              </TableCell>
                              <TableCell>{studentMarks.length} subject(s)</TableCell>
                              <TableCell>
                                {average !== null ? `${average.toFixed(1)}%` : "-"}
                              </TableCell>
                              <TableCell>
                                {overallGrade !== "N/A" ? (
                                  <Badge className={getGradeColor(overallGrade)}>
                                    {overallGrade}
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">No marks</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={studentMarks.length === 0}
                                  onClick={() => generateReportCard(p.id)}
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Admin Report Format Settings Dialog */}
      <Dialog open={formatDialogOpen} onOpenChange={setFormatDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Sliders className="h-5 w-5 text-primary" />
              Edit Report Format Settings
            </DialogTitle>
            <CardDescription>
              Customize school headers, visible sections, signature blocks, and closing notices for
              report cards.
            </CardDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Header & Branding Section */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-semibold text-sm flex items-center gap-1.5 text-primary">
                <Building2 className="h-4 w-4" />
                School Header & Branding
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="headerTitle" className="text-xs font-semibold">
                    School Name / Title
                  </Label>
                  <Input
                    id="headerTitle"
                    value={editFormat.headerTitle}
                    onChange={(e) => setEditFormat({ ...editFormat, headerTitle: e.target.value })}
                    placeholder="e.g. Sunrise School"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="subtitle" className="text-xs font-semibold">
                    Report Subtitle
                  </Label>
                  <Input
                    id="subtitle"
                    value={editFormat.subtitle}
                    onChange={(e) => setEditFormat({ ...editFormat, subtitle: e.target.value })}
                    placeholder="e.g. Academic Performance Report Card"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="schoolAddress" className="text-xs font-semibold">
                    Address & Contact Information
                  </Label>
                  <Input
                    id="schoolAddress"
                    value={editFormat.schoolAddress}
                    onChange={(e) =>
                      setEditFormat({ ...editFormat, schoolAddress: e.target.value })
                    }
                    placeholder="e.g. P.O. Box 1234, Kampala, Uganda | Tel: +256 700 000 000"
                  />
                </div>
              </div>
            </div>

            {/* Layout & Visibility Options */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-semibold text-sm flex items-center gap-1.5 text-primary">
                <Sliders className="h-4 w-4" />
                Visible Content & Sections
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between border p-3 rounded-lg bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Class Rank / Position</Label>
                    <p className="text-xs text-muted-foreground">
                      Display student's position in class
                    </p>
                  </div>
                  <Switch
                    checked={editFormat.showClassRank}
                    onCheckedChange={(checked) =>
                      setEditFormat({ ...editFormat, showClassRank: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between border p-3 rounded-lg bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Attendance Summary</Label>
                    <p className="text-xs text-muted-foreground">
                      Display total days present in term
                    </p>
                  </div>
                  <Switch
                    checked={editFormat.showAttendance}
                    onCheckedChange={(checked) =>
                      setEditFormat({ ...editFormat, showAttendance: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between border p-3 rounded-lg bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Teacher Comments</Label>
                    <p className="text-xs text-muted-foreground">Include remarks per subject</p>
                  </div>
                  <Switch
                    checked={editFormat.showTeacherComments}
                    onCheckedChange={(checked) =>
                      setEditFormat({ ...editFormat, showTeacherComments: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between border p-3 rounded-lg bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Principal Signature Line</Label>
                    <p className="text-xs text-muted-foreground">Include signature & date line</p>
                  </div>
                  <Switch
                    checked={editFormat.showPrincipalSignature}
                    onCheckedChange={(checked) =>
                      setEditFormat({ ...editFormat, showPrincipalSignature: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between border p-3 rounded-lg bg-muted/20 sm:col-span-2">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">School Stamp Box</Label>
                    <p className="text-xs text-muted-foreground">
                      Reserve dedicated space for physical school stamp
                    </p>
                  </div>
                  <Switch
                    checked={editFormat.showStampBox}
                    onCheckedChange={(checked) =>
                      setEditFormat({ ...editFormat, showStampBox: checked })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Signatures & Footer Notice */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-1.5 text-primary">
                <FileText className="h-4 w-4" />
                Signatures & Closing Remarks
              </h3>
              <div className="space-y-3">
                {editFormat.showPrincipalSignature && (
                  <div className="space-y-1.5">
                    <Label htmlFor="principalTitle" className="text-xs font-semibold">
                      Signature Line Title
                    </Label>
                    <Input
                      id="principalTitle"
                      value={editFormat.principalTitle}
                      onChange={(e) =>
                        setEditFormat({ ...editFormat, principalTitle: e.target.value })
                      }
                      placeholder="e.g. Headteacher's Signature & Date"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="footerRemarks" className="text-xs font-semibold">
                    Closing Notice / Next Term Remarks
                  </Label>
                  <Textarea
                    id="footerRemarks"
                    rows={2}
                    value={editFormat.footerRemarks}
                    onChange={(e) =>
                      setEditFormat({ ...editFormat, footerRemarks: e.target.value })
                    }
                    placeholder="e.g. Next term begins on Monday 15th September. All fees must be cleared."
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between items-center pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFormat}
              className="text-muted-foreground hover:text-destructive"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset to Default
            </Button>
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <Button variant="outline" onClick={() => setFormatDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveFormat}>
                <Check className="h-4 w-4 mr-1.5" />
                Save Format Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Card Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b print:hidden">
            <DialogTitle>Report Card Preview</DialogTitle>
            {isAdmin && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-muted-foreground hover:text-foreground print:hidden"
                onClick={() => {
                  setEditFormat(formatConfig);
                  setFormatDialogOpen(true);
                }}
              >
                <Settings className="h-3.5 w-3.5 mr-1 print:hidden" />
                Format Settings
              </Button>
            )}
          </DialogHeader>

          {previewStudent && (
            <div className="space-y-4 py-4">
              {/* Header */}
              <div className="text-center border-b pb-4 space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">
                  {currentSchoolObj?.name || formatConfig.headerTitle}
                </h2>
                <p className="text-sm font-semibold text-primary">{formatConfig.subtitle}</p>
                {formatConfig.schoolAddress && (
                  <p className="text-xs text-muted-foreground">{formatConfig.schoolAddress}</p>
                )}
              </div>

              {/* Student Info */}
              <div className="flex flex-col sm:flex-row gap-4 bg-muted/50 p-4 rounded-lg text-sm items-start">
                <div className="shrink-0 flex items-center justify-center">
                  {previewStudent.photo ? (
                    <img
                      src={previewStudent.photo}
                      alt={`${previewStudent.firstName} ${previewStudent.lastName}`}
                      className="w-24 h-24 rounded-md object-cover border-2 border-background shadow-sm"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-md bg-background flex items-center justify-center border shadow-sm">
                      <span className="text-3xl text-muted-foreground font-semibold">
                        {previewStudent.firstName?.[0]}
                        {previewStudent.lastName?.[0]}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1 w-full">
                  <div>
                    <Label className="text-xs text-muted-foreground">Student Name</Label>
                    <p className="font-semibold">
                      {previewStudent.firstName} {previewStudent.lastName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Admission No</Label>
                    <p className="font-semibold font-mono">{previewStudent.admissionNo}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Class</Label>
                    <p className="font-semibold">
                      {classes.find((c) => c.id === previewStudent.classId)?.name || "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Term / Period</Label>
                    <p className="font-semibold">
                      {selectedTerm} {selectedYear}
                    </p>
                  </div>

                  {formatConfig.showClassRank && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Class Rank</Label>
                      <p className="font-semibold text-primary">
                        {getStudentClassRank(previewStudent.id)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Marks Table */}
              <div>
                <h3 className="font-semibold text-sm mb-2">Academic Performance</h3>
                <Table className="border text-xs">
                  <TableHeader className="bg-muted/60">
                    <TableRow>
                      <TableHead className="font-bold">Subject</TableHead>
                      <TableHead className="font-bold">Score</TableHead>
                      <TableHead className="font-bold">Grade</TableHead>
                      {formatConfig.showTeacherComments && (
                        <TableHead className="font-bold">Teacher Comment</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewStudent.marks.map((mark: any) => (
                      <TableRow key={mark.id}>
                        <TableCell className="font-medium">{mark.subject}</TableCell>
                        <TableCell className="font-mono">
                          {mark.score}/{mark.maxScore} (
                          {((mark.score / mark.maxScore) * 100).toFixed(0)}%)
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${getGradeColor(mark.grade || "")} text-[11px] px-2 py-0.5`}
                          >
                            {mark.grade}
                          </Badge>
                        </TableCell>
                        {formatConfig.showTeacherComments && (
                          <TableCell className="text-sm italic text-muted-foreground">
                            {mark.teacherComment || "-"}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Summary */}
              <div className="bg-primary/10 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs text-muted-foreground">Overall Average</Label>
                    <p className="text-2xl font-bold">
                      {calculateAverage(previewStudent.id)?.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Overall Grade</Label>
                    <Badge
                      className={`text-xl px-4 py-1.5 ${getGradeColor(
                        getOverallGrade(calculateAverage(previewStudent.id)),
                      )}`}
                    >
                      {getOverallGrade(calculateAverage(previewStudent.id))}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Signatures & Stamp Block */}
              {(formatConfig.showPrincipalSignature || formatConfig.showStampBox) && (
                <div className="grid grid-cols-2 gap-6 pt-4 border-t mt-4">
                  {formatConfig.showPrincipalSignature ? (
                    <div className="flex flex-col justify-end pt-8">
                      <div className="border-b border-foreground/40 mb-1 w-full" />
                      <p className="text-xs font-semibold text-center text-muted-foreground">
                        {formatConfig.principalTitle}
                      </p>
                    </div>
                  ) : (
                    <div />
                  )}

                  {formatConfig.showStampBox && (
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/40 rounded-lg p-3 h-20 bg-muted/20">
                      <p className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">
                        Official School Stamp
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Footer Remarks */}
              {formatConfig.footerRemarks && (
                <div className="p-3 bg-muted/40 rounded-md border text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground mr-1">Note:</span>
                  {formatConfig.footerRemarks}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={downloadReportCard}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student Marks Sheet Preview Dialog */}
      <Dialog open={marksSheetOpen} onOpenChange={setMarksSheetOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b gap-3">
            <div>
              <DialogTitle className="text-xl font-bold">
                {currentSchoolObj?.name || formatConfig.headerTitle} - Student Marks Sheet
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Class:{" "}
                <span className="font-semibold text-foreground">
                  {currentClassObj?.name || "All Classes"}
                </span>{" "}
                | Term: <span className="font-semibold text-foreground">{selectedTerm}</span> |
                Year: <span className="font-semibold text-foreground">{selectedYear}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-1.5" />
                Print Sheet
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const headers = [
                    "Admission No",
                    "Student Name",
                    ...subjects,
                    "Average (%)",
                    "Overall Grade",
                  ];
                  const rows = broadsheetData.map(
                    ({ student, subjectMarks, avgPct, overallGrade }) => [
                      student.admissionNo,
                      `${student.firstName} ${student.lastName}`,
                      ...subjects.map((s) => {
                        const item = subjectMarks[s];
                        if (!item) return "-";
                        if (sheetDisplayMode === "score") return `${item.score}/${item.maxScore}`;
                        if (sheetDisplayMode === "percentage") return `${item.pct.toFixed(0)}%`;
                        return item.grade || "-";
                      }),
                      avgPct !== null ? `${avgPct.toFixed(1)}%` : "-",
                      overallGrade,
                    ],
                  );
                  const classNameStr = currentClassObj?.name || "All_Classes";
                  downloadCSV(
                    `Marks_Sheet_${classNameStr.replace(/\s+/g, "_")}_${selectedTerm}_${selectedYear}`,
                    headers,
                    rows,
                  );
                  toast.success("Exported Marks Sheet to CSV / Excel");
                }}
              >
                <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                Export Excel
              </Button>
            </div>
          </DialogHeader>

          <div className="py-2 px-3 flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 rounded-md">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold">Class:</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="h-8 text-xs w-44 bg-background">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredClasses.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold">Display Format:</Label>
                <div className="flex bg-background border rounded-lg p-0.5 text-xs font-medium">
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-md transition ${
                      sheetDisplayMode === "score"
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setSheetDisplayMode("score")}
                  >
                    Score (e.g. 85/100)
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-md transition ${
                      sheetDisplayMode === "percentage"
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setSheetDisplayMode("percentage")}
                  >
                    Percentage (%)
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-md transition ${
                      sheetDisplayMode === "grade"
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setSheetDisplayMode("grade")}
                  >
                    Grade (A-E)
                  </button>
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Total Students:{" "}
              <span className="font-semibold text-foreground">{selectedClassStudents.length}</span>
            </div>
          </div>

          <div className="flex-1 overflow-auto py-2">
            <Table className="border text-xs">
              <TableHeader className="bg-muted/70 sticky top-0">
                <TableRow>
                  <TableHead className="w-10 text-center font-bold">#</TableHead>
                  {isAdmin && <TableHead className="w-28 font-bold">Admission No</TableHead>}
                  <TableHead className="min-w-[140px] font-bold">Student Name</TableHead>
                  {subjects.map((s) => (
                    <TableHead key={s} className="text-center min-w-[75px] font-bold">
                      {s}
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-bold bg-muted/90">Average %</TableHead>
                  <TableHead className="text-center font-bold bg-muted/90">Overall Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {broadsheetData.map((row, idx) => (
                  <TableRow key={row.student.id} className="hover:bg-muted/40">
                    <TableCell className="text-center font-medium text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="font-mono text-xs">{row.student.admissionNo}</TableCell>
                    )}
                    <TableCell className="font-semibold">
                      {row.student.firstName} {row.student.lastName}
                    </TableCell>
                    {subjects.map((s) => {
                      const m = row.subjectMarks[s];
                      if (!m) {
                        return (
                          <TableCell key={s} className="text-center text-muted-foreground">
                            -
                          </TableCell>
                        );
                      }
                      if (sheetDisplayMode === "score") {
                        return (
                          <TableCell key={s} className="text-center font-medium">
                            {m.score}/{m.maxScore}
                          </TableCell>
                        );
                      }
                      if (sheetDisplayMode === "percentage") {
                        return (
                          <TableCell key={s} className="text-center font-medium">
                            {m.pct.toFixed(0)}%
                          </TableCell>
                        );
                      }
                      return (
                        <TableCell key={s} className="text-center">
                          {m.grade ? (
                            <Badge className={`${getGradeColor(m.grade)} text-[10px] px-1.5 py-0`}>
                              {m.grade}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center font-bold bg-muted/20">
                      {row.avgPct !== null ? `${row.avgPct.toFixed(1)}%` : "-"}
                    </TableCell>
                    <TableCell className="text-center font-bold bg-muted/20">
                      {row.overallGrade !== "N/A" ? (
                        <Badge
                          className={`${getGradeColor(row.overallGrade)} text-[10px] px-2 py-0.5`}
                        >
                          {row.overallGrade}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          N/A
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {broadsheetData.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={subjects.length + 5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No active students found for this class.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="pt-2 border-t flex justify-end">
            <Button variant="outline" onClick={() => setMarksSheetOpen(false)}>
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
