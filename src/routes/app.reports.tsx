import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, FileText, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/app/reports")({
  head: () => ({ meta: [{ title: "Reports - Little Stars" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const { pupils, attendance, classes, marks } = useStore();
  const today = new Date().toISOString().slice(0, 10);
  const todayAtt = attendance.filter((a) => a.date === today);
  const [selectedClass, setSelectedClass] = useState(classes[0]?.id ?? "");
  const [selectedTerm, setSelectedTerm] = useState("Term 2");
  const [selectedYear, setSelectedYear] = useState("2025");
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewPupil, setPreviewPupil] = useState<any>(null);

  const lateThreshold = "08:00";
  const late = todayAtt.filter((a) => a.arrival && a.arrival > lateThreshold);

  const exportToast = (kind: string) => toast.success(`${kind} export prepared (demo)`);

  const terms = ["Term 1", "Term 2", "Term 3"];

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A": return "bg-green-500";
      case "B": return "bg-blue-500";
      case "C": return "bg-yellow-500";
      case "D": return "bg-orange-500";
      case "E": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const calculateAverage = (pupilId: string) => {
    const pupilMarks = marks.filter(
      (m) => m.pupilId === pupilId && m.term === selectedTerm && m.year === selectedYear
    );
    if (pupilMarks.length === 0) return null;
    
    const totalPercentage = pupilMarks.reduce((sum, m) => sum + (m.score / m.maxScore) * 100, 0);
    return totalPercentage / pupilMarks.length;
  };

  const getOverallGrade = (average: number | null) => {
    if (average === null) return "N/A";
    if (average >= 90) return "A";
    if (average >= 80) return "B";
    if (average >= 70) return "C";
    if (average >= 60) return "D";
    return "E";
  };

  const generateReportCard = (pupilId: string) => {
    const pupil = pupils.find((p) => p.id === pupilId);
    if (!pupil) return;
    
    const pupilMarks = marks.filter(
      (m) => m.pupilId === pupilId && m.term === selectedTerm && m.year === selectedYear
    );

    if (pupilMarks.length === 0) {
      toast.error(`No marks found for ${pupil.firstName} ${pupil.lastName}`);
      return;
    }

    setPreviewPupil({ ...pupil, marks: pupilMarks });
    setPreviewDialogOpen(true);
  };

  const generateAllReportCards = () => {
    const classPupils = pupils.filter((p) => p.classId === selectedClass && p.active);
    const pupilsWithMarks = classPupils.filter((p) => {
      const pupilMarks = marks.filter(
        (m) => m.pupilId === p.id && m.term === selectedTerm && m.year === selectedYear
      );
      return pupilMarks.length > 0;
    });

    if (pupilsWithMarks.length === 0) {
      toast.error("No pupils with marks in this class for the selected term");
      return;
    }

    toast.success(`Generated ${pupilsWithMarks.length} report cards (demo)`);
  };

  const downloadReportCard = () => {
    toast.success("Report card downloaded as PDF (demo)");
    setPreviewDialogOpen(false);
  };

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
                <Button size="sm" variant="outline" onClick={() => exportToast("PDF")}><FileText className="h-4 w-4 mr-1" />PDF</Button>
                <Button size="sm" variant="outline" onClick={() => exportToast("Excel")}><FileSpreadsheet className="h-4 w-4 mr-1" />Excel</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Pupil</TableHead><TableHead>Class</TableHead><TableHead>Arrival</TableHead><TableHead>Departure</TableHead></TableRow></TableHeader>
                <TableBody>
                  {todayAtt.map((a) => {
                    const p = pupils.find((x) => x.id === a.pupilId);
                    if (!p) return null;
                    return (
                      <TableRow key={a.id}>
                        <TableCell>{p.firstName} {p.lastName}</TableCell>
                        <TableCell>{classes.find((c) => c.id === p.classId)?.name}</TableCell>
                        <TableCell>{a.arrival ?? "-"}</TableCell>
                        <TableCell>{a.departure ?? "-"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="mt-4">
          <Card><CardContent className="p-8 text-center text-muted-foreground"><Download className="h-8 w-8 mx-auto mb-3" />Weekly report aggregates this week's attendance per pupil. Export to PDF or Excel.</CardContent></Card>
        </TabsContent>
        <TabsContent value="monthly" className="mt-4">
          <Card><CardContent className="p-8 text-center text-muted-foreground"><Download className="h-8 w-8 mx-auto mb-3" />Monthly report aggregates the month's attendance per pupil and class. Export to PDF or Excel.</CardContent></Card>
        </TabsContent>

        <TabsContent value="late" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Late arrivals (after {lateThreshold})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Pupil</TableHead><TableHead>Arrival</TableHead></TableRow></TableHeader>
                <TableBody>
                  {late.map((a) => {
                    const p = pupils.find((x) => x.id === a.pupilId);
                    if (!p) return null;
                    return <TableRow key={a.id}><TableCell>{p.firstName} {p.lastName}</TableCell><TableCell>{a.arrival}</TableCell></TableRow>;
                  })}
                  {late.length === 0 && <TableRow><TableCell colSpan={2} className="text-center py-6 text-muted-foreground">No late arrivals today</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report-cards" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Generate Report Cards
              </CardTitle>
              <CardDescription>
                Generate academic report cards for pupils based on their marks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (
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
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Admission No</TableHead>
                        <TableHead>Pupil Name</TableHead>
                        <TableHead>Subjects</TableHead>
                        <TableHead>Average</TableHead>
                        <TableHead>Overall Grade</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pupils
                        .filter((p) => p.classId === selectedClass && p.active)
                        .map((p) => {
                          const pupilMarks = marks.filter(
                            (m) => m.pupilId === p.id && m.term === selectedTerm && m.year === selectedYear
                          );
                          const average = calculateAverage(p.id);
                          const overallGrade = getOverallGrade(average);

                          return (
                            <TableRow key={p.id}>
                              <TableCell>{p.admissionNo}</TableCell>
                              <TableCell className="font-medium">
                                {p.firstName} {p.lastName}
                              </TableCell>
                              <TableCell>{pupilMarks.length} subject(s)</TableCell>
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
                                  disabled={pupilMarks.length === 0}
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

      {/* Report Card Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Card Preview</DialogTitle>
          </DialogHeader>
          {previewPupil && (
            <div className="space-y-4 py-4">
              {/* Header */}
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-bold">Little Stars Kindergarten</h2>
                <p className="text-muted-foreground">Academic Report Card</p>
              </div>

              {/* Pupil Info */}
              <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                <div>
                  <Label className="text-muted-foreground">Pupil Name</Label>
                  <p className="font-semibold">
                    {previewPupil.firstName} {previewPupil.lastName}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Admission No</Label>
                  <p className="font-semibold">{previewPupil.admissionNo}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Class</Label>
                  <p className="font-semibold">
                    {classes.find((c) => c.id === previewPupil.classId)?.name}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Term</Label>
                  <p className="font-semibold">
                    {selectedTerm} {selectedYear}
                  </p>
                </div>
              </div>

              {/* Marks Table */}
              <div>
                <h3 className="font-semibold mb-2">Academic Performance</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Teacher Comment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewPupil.marks.map((mark: any) => (
                      <TableRow key={mark.id}>
                        <TableCell className="font-medium">{mark.subject}</TableCell>
                        <TableCell>
                          {mark.score}/{mark.maxScore} ({((mark.score / mark.maxScore) * 100).toFixed(0)}%)
                        </TableCell>
                        <TableCell>
                          <Badge className={getGradeColor(mark.grade || "")}>
                            {mark.grade}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{mark.teacherComment || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Summary */}
              <div className="bg-primary/10 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-muted-foreground">Overall Average</Label>
                    <p className="text-2xl font-bold">
                      {calculateAverage(previewPupil.id)?.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Overall Grade</Label>
                    <Badge
                      className={`text-xl px-4 py-2 ${getGradeColor(
                        getOverallGrade(calculateAverage(previewPupil.id))
                      )}`}
                    >
                      {getOverallGrade(calculateAverage(previewPupil.id))}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
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
    </AppShell>
  );
}