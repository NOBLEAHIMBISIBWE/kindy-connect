import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  FileSpreadsheet,
  Printer,
  Save,
  Check,
  Loader2,
  RotateCcw,
  Search,
  User,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { downloadCSV } from "@/lib/export-utils";

export const Route = createFileRoute("/app/marks")({
  head: () => ({ meta: [{ title: "Marks & Grades - Noble Edu" }] }),
  component: MarksPage,
});

function MarksPage() {
  const {
    currentUser,
    students = [],
    classes = [],
    marks = [],
    addMark,
    updateMark,
    deleteMark,
    saveBulkMarks,
    schools = [],
    getSchoolSubjects,
    loading = false,
  } = useStore();

  const isTeacher = currentUser?.role === "teacher";
  const isSchoolAdmin = currentUser?.role === "admin";
  const isAdmin = currentUser?.role === "super_admin" || currentUser?.role === "admin";
  const canEditMarks = isTeacher || isSchoolAdmin;

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

  const [classId, setClassId] = useState<string>("");

  useEffect(() => {
    if (filteredClasses.length > 0) {
      const defaultClass = isTeacher
        ? (currentUser?.classId ?? filteredClasses[0]?.id)
        : filteredClasses[0]?.id;
      setClassId((curr) => {
        if (!curr || !filteredClasses.some((c) => c.id === curr)) {
          return defaultClass ?? "";
        }
        return curr;
      });
    } else {
      setClassId("");
    }
  }, [filteredClasses, currentUser, isTeacher]);

  const [term, setTerm] = useState("Term 2");
  const [year, setYear] = useState("2025");
  const [subject, setSubject] = useState("Reading");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [sheetDialogOpen, setSheetDialogOpen] = useState(false);
  const [sheetDisplayMode, setSheetDisplayMode] = useState<"score" | "percentage" | "grade">(
    "score",
  );
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [editingMark, setEditingMark] = useState<any>(null);
  const [formData, setFormData] = useState({
    score: "",
    maxScore: "100",
    teacherComment: "",
  });

  const classStudents = useMemo(() => {
    return students
      .filter((p) => p.classId === classId && p.active)
      .sort((a, b) => a.firstName.localeCompare(b.firstName));
  }, [students, classId]);

  const filteredMarks = useMemo(() => {
    return marks.filter((m) => m.term === term && m.year === year && m.subject === subject);
  }, [marks, term, year, subject]);

  const activeSchoolId =
    currentUser?.role === "super_admin" ? superSchoolId : currentUser?.schoolId;
  const rawSchoolSubjects = getSchoolSubjects(activeSchoolId);
  const subjects = useMemo(() => rawSchoolSubjects.map((s) => s.name), [rawSchoolSubjects]);

  const currentClass = classes.find((c) => c.id === classId);

  // Filter subjects for selected class and teachers (assigned subjects)
  const availableSubjects = useMemo(() => {
    let list = subjects;
    if (currentClass?.subjects && currentClass.subjects.length > 0) {
      list = list.filter((s) => currentClass.subjects?.includes(s));
    }
    if (isTeacher && currentUser?.subjects && currentUser.subjects.length > 0) {
      list = list.filter((s) => currentUser.subjects?.includes(s));
    }
    return list;
  }, [isTeacher, currentUser, subjects, currentClass]);

  // Ensure selected subject exists in available subjects
  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.includes(subject)) {
      setSubject(availableSubjects[0]);
    }
  }, [availableSubjects, subject]);

  const terms = ["Term 1", "Term 2", "Term 3"];

  const currentSchool = schools.find(
    (s) => s.id === (currentClass?.schoolId || currentUser?.schoolId),
  );
  // State for Class-Wide Inline Marks Entry
  const [inlineMarks, setInlineMarks] = useState<
    Record<
      string,
      {
        score: string;
        maxScore: string;
        teacherComment: string;
        markId?: string;
        isDirty?: boolean;
      }
    >
  >({});
  const [defaultMaxScore, setDefaultMaxScore] = useState("100");
  const [isSaving, setIsSaving] = useState(false);

  // Sync inline state whenever students or selected criteria change
  useEffect(() => {
    const initialMap: Record<
      string,
      {
        score: string;
        maxScore: string;
        teacherComment: string;
        markId?: string;
        isDirty?: boolean;
      }
    > = {};

    classStudents.forEach((p) => {
      const existing = filteredMarks.find((m) => m.studentId === p.id);
      if (existing) {
        initialMap[p.id] = {
          score: existing.score.toString(),
          maxScore: existing.maxScore.toString(),
          teacherComment: existing.teacherComment || "",
          markId: existing.id,
          isDirty: false,
        };
      } else {
        initialMap[p.id] = {
          score: "",
          maxScore: defaultMaxScore,
          teacherComment: "",
          markId: undefined,
          isDirty: false,
        };
      }
    });

    setInlineMarks(initialMap);
  }, [classStudents, filteredMarks, term, year, subject, classId, defaultMaxScore]);

  const handleInlineChange = (
    studentId: string,
    field: "score" | "maxScore" | "teacherComment",
    value: string,
  ) => {
    setInlineMarks((prev) => {
      const existing = prev[studentId] || {
        score: "",
        maxScore: defaultMaxScore,
        teacherComment: "",
      };
      return {
        ...prev,
        [studentId]: {
          ...existing,
          [field]: value,
          isDirty: true,
        },
      };
    });
  };

  const applyDefaultMaxScoreToAll = (newMax: string) => {
    setDefaultMaxScore(newMax);
    setInlineMarks((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((pid) => {
        updated[pid] = {
          ...updated[pid],
          maxScore: newMax,
          isDirty: true,
        };
      });
      return updated;
    });
  };

  const dirtyCount = useMemo(() => {
    return Object.values(inlineMarks).filter((m) => m.isDirty && m.score.trim() !== "").length;
  }, [inlineMarks]);

  const handleSaveAllInlineMarks = async () => {
    const marksToSave: Array<{
      id?: string;
      studentId: string;
      subject: string;
      term: string;
      year: string;
      score: number;
      maxScore: number;
      teacherComment?: string;
    }> = [];

    Object.entries(inlineMarks).forEach(([studentId, data]) => {
      if (data.isDirty && data.score.trim() !== "" && !isNaN(parseFloat(data.score))) {
        marksToSave.push({
          id: data.markId,
          studentId,
          subject,
          term,
          year,
          score: parseFloat(data.score),
          maxScore: parseFloat(data.maxScore) || 100,
          teacherComment: data.teacherComment,
        });
      }
    });

    if (marksToSave.length === 0) {
      toast.info("No unsaved marks to save.");
      return;
    }

    setIsSaving(true);
    try {
      await saveBulkMarks(marksToSave);
      toast.success(`Successfully saved marks for ${marksToSave.length} student(s)!`);
    } catch (err: any) {
      console.error("Failed to save bulk marks:", err);
      toast.error(err?.message || "Failed to save marks");
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard Navigation: Enter / Down Arrow moves to next student's score input, Up Arrow moves to previous
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    studentIndex: number,
    field: "score" | "maxScore" | "teacherComment",
  ) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      const nextInput = document.getElementById(`inline-${field}-${studentIndex + 1}`);
      if (nextInput) {
        (nextInput as HTMLInputElement).focus();
        (nextInput as HTMLInputElement).select();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevInput = document.getElementById(`inline-${field}-${studentIndex - 1}`);
      if (prevInput) {
        (prevInput as HTMLInputElement).focus();
        (prevInput as HTMLInputElement).select();
      }
    }
  };
  const selectedStudent = useMemo(
    () => classStudents.find((p) => p.id === selectedStudentId),
    [classStudents, selectedStudentId],
  );

  const existingMarkForSelected = useMemo(
    () => filteredMarks.find((m) => m.studentId === selectedStudentId),
    [filteredMarks, selectedStudentId],
  );

  // Auto select first student when opening Add Mark dialog if none selected
  useEffect(() => {
    if (addDialogOpen && classStudents.length > 0) {
      if (!selectedStudentId || !classStudents.some((p) => p.id === selectedStudentId)) {
        selectStudentForEntry(classStudents[0].id);
      } else {
        selectStudentForEntry(selectedStudentId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addDialogOpen]);

  const selectStudentForEntry = (studentId: string) => {
    setSelectedStudentId(studentId);
    const existingMark = marks.find(
      (m) =>
        m.studentId === studentId && m.subject === subject && m.term === term && m.year === year,
    );
    if (existingMark) {
      setEditingMark(existingMark);
      setFormData({
        score: existingMark.score.toString(),
        maxScore: existingMark.maxScore.toString(),
        teacherComment: existingMark.teacherComment || "",
      });
    } else {
      setEditingMark(null);
      setFormData((prev) => ({
        score: "",
        maxScore: prev.maxScore || "100",
        teacherComment: "",
      }));
    }
  };

  // Compute broadsheet marks matrix for the student sheet preview
  const broadsheetData = useMemo(() => {
    return classStudents.map((p) => {
      const studentMarks = marks.filter(
        (m) => m.studentId === p.id && m.term === term && m.year === year,
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
  }, [classStudents, marks, term, year, subjects]);

  const handleSaveMark = (andNext: boolean = false) => {
    if (!selectedStudentId || !formData.score || !formData.maxScore) {
      toast.error("Please fill in score and max score");
      return;
    }

    const scoreNum = parseFloat(formData.score);
    const maxScoreNum = parseFloat(formData.maxScore);

    if (isNaN(scoreNum) || isNaN(maxScoreNum) || maxScoreNum <= 0) {
      toast.error("Please enter valid numeric values");
      return;
    }

    const student = classStudents.find((p) => p.id === selectedStudentId);
    const existingMark = marks.find(
      (m) =>
        m.studentId === selectedStudentId &&
        m.subject === subject &&
        m.term === term &&
        m.year === year,
    );

    if (existingMark) {
      updateMark(existingMark.id, {
        score: scoreNum,
        maxScore: maxScoreNum,
        teacherComment: formData.teacherComment,
      });
      toast.success(`Mark updated for ${student?.firstName} ${student?.lastName}`);
    } else {
      addMark({
        studentId: selectedStudentId,
        subject,
        term,
        year,
        score: scoreNum,
        maxScore: maxScoreNum,
        teacherComment: formData.teacherComment,
      });
      toast.success(`Mark added for ${student?.firstName} ${student?.lastName}`);
    }

    if (andNext) {
      const currentIndex = classStudents.findIndex((p) => p.id === selectedStudentId);
      if (currentIndex !== -1 && currentIndex < classStudents.length - 1) {
        const nextStudent = classStudents[currentIndex + 1];
        selectStudentForEntry(nextStudent.id);
      }
    }
  };

  const handleEditMark = () => {
    if (!editingMark || !formData.score || !formData.maxScore) {
      toast.error("Please fill in all required fields");
      return;
    }

    updateMark(editingMark.id, {
      score: parseFloat(formData.score),
      maxScore: parseFloat(formData.maxScore),
      teacherComment: formData.teacherComment,
    });

    const student = classStudents.find((p) => p.id === editingMark.studentId);
    toast.success(`Mark updated for ${student?.firstName} ${student?.lastName}`);
    setEditDialogOpen(false);
    setEditingMark(null);
    setFormData({ score: "", maxScore: "100", teacherComment: "" });
  };

  const handleDelete = (markId: string, studentName: string) => {
    if (confirm(`Are you sure you want to delete this mark for ${studentName}?`)) {
      deleteMark(markId);
      toast.success("Mark deleted");
      if (editingMark?.id === markId) {
        setFormData((prev) => ({ ...prev, score: "", teacherComment: "" }));
        setEditingMark(null);
      }
    }
  };

  const openEditDialog = (mark: any) => {
    setSelectedStudentId(mark.studentId);
    setEditingMark(mark);
    setFormData({
      score: mark.score.toString(),
      maxScore: mark.maxScore.toString(),
      teacherComment: mark.teacherComment || "",
    });
    setAddDialogOpen(true);
  };

  const openAddForStudent = (studentId: string) => {
    selectStudentForEntry(studentId);
    setAddDialogOpen(true);
  };

  const computeGrade = (scoreStr: string, maxScoreStr: string) => {
    const s = parseFloat(scoreStr);
    const m = parseFloat(maxScoreStr);
    if (isNaN(s) || isNaN(m) || m <= 0) return null;
    const pct = (s / m) * 100;
    if (pct >= 90) return "A";
    if (pct >= 80) return "B";
    if (pct >= 70) return "C";
    if (pct >= 60) return "D";
    return "E";
  };

  const handleKeyDownForm = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    isEditMode: boolean = false,
  ) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();

      const currentStudentId = selectedStudentId;
      if (!currentStudentId) return;

      if (formData.score && formData.maxScore) {
        const existingMark = marks.find(
          (m) =>
            m.studentId === currentStudentId &&
            m.subject === subject &&
            m.term === term &&
            m.year === year,
        );

        if (existingMark) {
          updateMark(existingMark.id, {
            score: parseFloat(formData.score),
            maxScore: parseFloat(formData.maxScore),
            teacherComment: formData.teacherComment,
          });
        } else {
          addMark({
            studentId: currentStudentId,
            subject,
            term,
            year,
            score: parseFloat(formData.score),
            maxScore: parseFloat(formData.maxScore),
            teacherComment: formData.teacherComment,
          });
        }
      }

      const currentIndex = classStudents.findIndex((p) => p.id === currentStudentId);
      if (currentIndex !== -1) {
        const nextIndex =
          e.key === "ArrowDown"
            ? (currentIndex + 1) % classStudents.length
            : (currentIndex - 1 + classStudents.length) % classStudents.length;

        const nextStudent = classStudents[nextIndex];
        selectStudentForEntry(nextStudent.id);
      }
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A":
        return "bg-green-500 text-white";
      case "B":
        return "bg-blue-500 text-white";
      case "C":
        return "bg-yellow-500 text-white";
      case "D":
        return "bg-orange-500 text-white";
      case "E":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const gradePreview = useMemo(() => {
    const s = parseFloat(formData.score);
    const m = parseFloat(formData.maxScore);
    if (isNaN(s) || isNaN(m) || m <= 0) return null;
    const pct = (s / m) * 100;
    let grade = "E";
    if (pct >= 90) grade = "A";
    else if (pct >= 80) grade = "B";
    else if (pct >= 70) grade = "C";
    else if (pct >= 60) grade = "D";
    return { pct, grade };
  }, [formData.score, formData.maxScore]);

  if (loading && !currentUser) {
    return (
      <AppShell title="Marks & Grades">
        <div className="min-h-[50vh] flex flex-col items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading marks...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Marks & Grades">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl">Class Marks Entry</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enter scores directly for all students in the class sequentially without individual
                lookup.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setSheetDialogOpen(true)}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Preview Broadsheet
              </Button>
              {canEditMarks && (
                <Button
                  size="sm"
                  onClick={handleSaveAllInlineMarks}
                  disabled={isSaving || dirtyCount === 0}
                  className={dirtyCount > 0 ? "bg-primary shadow-sm" : ""}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save All Marks {dirtyCount > 0 && `(${dirtyCount})`}
                    </>
                  )}
                </Button>
              )}
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Mark
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6">
                  <DialogHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <DialogTitle className="text-xl font-bold">Enter / Add Marks</DialogTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          Subject: <span className="font-semibold text-foreground">{subject}</span>{" "}
                          | Class:{" "}
                          <span className="font-semibold text-foreground">
                            {currentClass?.name || "Selected Class"}
                          </span>{" "}
                          | Term: <span className="font-semibold text-foreground">{term}</span> |
                          Year: <span className="font-semibold text-foreground">{year}</span>
                        </p>
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-4 flex-1 overflow-hidden">
                    {/* Left Column: All Students Display */}
                    <div className="md:col-span-5 flex flex-col border-r pr-4 h-full min-h-0">
                      <div className="space-y-2 mb-3">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search student..."
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                            className="pl-9 h-9 text-xs"
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                          <span>
                            All Students (
                            <strong className="text-foreground">{classStudents.length}</strong>)
                          </span>
                          <span>
                            <strong className="text-green-600">{filteredMarks.length}</strong> /{" "}
                            {classStudents.length} marked
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[380px]">
                        {classStudents
                          .filter((p) =>
                            `${p.firstName} ${p.lastName} ${p.admissionNo || ""}`
                              .toLowerCase()
                              .includes(studentSearch.toLowerCase()),
                          )
                          .map((p) => {
                            const m = filteredMarks.find((mark) => mark.studentId === p.id);
                            const isSelected = p.id === selectedStudentId;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => selectStudentForEntry(p.id)}
                                className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between cursor-pointer ${
                                  isSelected
                                    ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary"
                                    : "bg-card hover:bg-accent/50 border-border"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                      isSelected
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {p.firstName[0]}
                                    {p.lastName[0]}
                                  </div>
                                  <div className="min-w-0 truncate">
                                    <p className="font-semibold text-xs leading-none truncate">
                                      {p.firstName} {p.lastName}
                                    </p>
                                    {p.admissionNo && (
                                      <p className="text-[11px] text-muted-foreground mt-0.5 font-mono truncate">
                                        {p.admissionNo}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="shrink-0 ml-2">
                                  {m ? (
                                    <Badge
                                      className={`${getGradeColor(m.grade || "")} text-[10px] px-1.5 py-0.5`}
                                    >
                                      {m.score}/{m.maxScore} ({m.grade})
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] text-muted-foreground px-1.5 py-0.5"
                                    >
                                      No mark
                                    </Badge>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        {classStudents.length === 0 && (
                          <p className="text-center text-xs text-muted-foreground py-8">
                            No students in this class.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Selected Student Mark Form */}
                    <div className="md:col-span-7 flex flex-col justify-between h-full space-y-4">
                      {selectedStudent ? (
                        <>
                          <div className="space-y-4">
                            <div className="p-3 bg-muted/40 rounded-lg border flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                                  {selectedStudent.firstName[0]}
                                  {selectedStudent.lastName[0]}
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm">
                                    {selectedStudent.firstName} {selectedStudent.lastName}
                                  </h4>
                                  <p className="text-xs text-muted-foreground">
                                    Adm No: {selectedStudent.admissionNo || "N/A"}
                                  </p>
                                </div>
                              </div>
                              {existingMarkForSelected ? (
                                <Badge
                                  className={`${getGradeColor(existingMarkForSelected.grade || "")} px-2.5 py-1 text-xs font-semibold`}
                                >
                                  Saved: {existingMarkForSelected.score}/
                                  {existingMarkForSelected.maxScore} (
                                  {existingMarkForSelected.grade})
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="px-2.5 py-1 text-xs">
                                  Pending Entry
                                </Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="add-score" className="text-xs font-semibold">
                                  Score
                                </Label>
                                <Input
                                  id="add-score"
                                  type="number"
                                  min="0"
                                  value={formData.score}
                                  onChange={(e) =>
                                    setFormData({ ...formData, score: e.target.value })
                                  }
                                  onKeyDown={(e) => handleKeyDownForm(e, !!existingMarkForSelected)}
                                  placeholder="e.g. 85"
                                  className="text-sm font-semibold"
                                  autoFocus
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="add-max" className="text-xs font-semibold">
                                  Max Score
                                </Label>
                                <Input
                                  id="add-max"
                                  type="number"
                                  min="1"
                                  value={formData.maxScore}
                                  onChange={(e) =>
                                    setFormData({ ...formData, maxScore: e.target.value })
                                  }
                                  onKeyDown={(e) => handleKeyDownForm(e, !!existingMarkForSelected)}
                                  className="text-sm"
                                />
                              </div>
                            </div>

                            {gradePreview && (
                              <div className="p-3 bg-accent/30 rounded-lg border text-xs flex items-center justify-between">
                                <span className="text-muted-foreground font-medium">
                                  Calculated Percentage & Grade:
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-sm">
                                    {gradePreview.pct.toFixed(1)}%
                                  </span>
                                  <Badge
                                    className={`${getGradeColor(gradePreview.grade)} px-2 py-0.5 text-xs font-bold`}
                                  >
                                    Grade {gradePreview.grade}
                                  </Badge>
                                </div>
                              </div>
                            )}

                            <div className="space-y-2">
                              <Label htmlFor="add-comment" className="text-xs font-semibold">
                                Teacher Remarks / Comment (Optional)
                              </Label>
                              <Textarea
                                id="add-comment"
                                value={formData.teacherComment}
                                onChange={(e) =>
                                  setFormData({ ...formData, teacherComment: e.target.value })
                                }
                                onKeyDown={(e) => handleKeyDownForm(e, !!existingMarkForSelected)}
                                placeholder="e.g., Excellent performance, shown good understanding."
                                rows={3}
                                className="text-xs"
                              />
                            </div>
                          </div>

                          <div className="pt-3 border-t flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span>Tip: Use ↑ ↓ arrow keys to navigate</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAddDialogOpen(false)}
                              >
                                Close
                              </Button>
                              {existingMarkForSelected && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    handleDelete(
                                      existingMarkForSelected.id,
                                      `${selectedStudent.firstName} ${selectedStudent.lastName}`,
                                    )
                                  }
                                >
                                  Delete
                                </Button>
                              )}
                              <Button size="sm" onClick={() => handleSaveMark(false)}>
                                {existingMarkForSelected ? "Update Mark" : "Save Mark"}
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleSaveMark(true)}
                              >
                                Save & Next <ChevronRight className="h-4 w-4 ml-1" />
                              </Button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                          <User className="h-10 w-10 mb-2 opacity-40" />
                          <p className="text-xs">
                            Click on a student from the list on the left to enter marks.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 bg-muted/30 rounded-lg border">
            <div className="flex flex-wrap items-center gap-3">
              {currentUser?.role === "super_admin" && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-semibold">School:</Label>
                  <select
                    value={superSchoolId}
                    onChange={(e) => setSuperSchoolId(e.target.value)}
                    className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold">Class:</Label>
                <Select value={classId} onValueChange={setClassId} disabled={isTeacher}>
                  <SelectTrigger className="w-40 h-9 text-xs bg-background">
                    <SelectValue />
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
                <Label className="text-xs font-semibold">Subject:</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger className="w-44 h-9 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubjects.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold">Term:</Label>
                <Select value={term} onValueChange={setTerm}>
                  <SelectTrigger className="w-28 h-9 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {terms.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold">Year:</Label>
                <Input
                  type="number"
                  className="w-20 h-9 text-xs bg-background"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </div>
            </div>

            {canEditMarks && (
              <div className="flex items-center gap-2 border-l pl-3">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Default Max Score:
                </Label>
                <Input
                  type="number"
                  className="w-20 h-9 text-xs bg-background"
                  value={defaultMaxScore}
                  onChange={(e) => applyDefaultMaxScoreToAll(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="overflow-x-auto border rounded-lg">
            <Table className="text-xs">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-10 text-center font-bold">#</TableHead>
                  <TableHead className="min-w-[160px] font-bold">Student Name</TableHead>
                  {isAdmin && <TableHead className="w-28 font-bold">Admission No</TableHead>}
                  <TableHead className="w-28 font-bold">Score</TableHead>
                  <TableHead className="w-24 font-bold">Max Score</TableHead>
                  <TableHead className="w-20 text-center font-bold">Grade</TableHead>
                  <TableHead className="min-w-[200px] font-bold">Teacher Comment</TableHead>
                  <TableHead className="w-28 text-right font-bold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classStudents.map((p, idx) => {
                  const item = inlineMarks[p.id] || {
                    score: "",
                    maxScore: defaultMaxScore,
                    teacherComment: "",
                    markId: undefined,
                    isDirty: false,
                  };
                  const liveGrade = computeGrade(item.score, item.maxScore);

                  return (
                    <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-center font-medium text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {p.firstName} {p.lastName}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {p.admissionNo}
                        </TableCell>
                      )}
                      <TableCell>
                        <Input
                          id={`inline-score-${idx}`}
                          type="number"
                          step="0.5"
                          min="0"
                          max={item.maxScore}
                          placeholder="Score"
                          disabled={!canEditMarks}
                          value={item.score}
                          onChange={(e) => handleInlineChange(p.id, "score", e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, idx, "score")}
                          className="h-8 text-xs font-semibold w-24 bg-background focus:ring-2 focus:ring-primary"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          id={`inline-maxScore-${idx}`}
                          type="number"
                          min="1"
                          placeholder="Max"
                          disabled={!canEditMarks}
                          value={item.maxScore}
                          onChange={(e) => handleInlineChange(p.id, "maxScore", e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, idx, "maxScore")}
                          className="h-8 text-xs w-20 bg-background text-muted-foreground"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {liveGrade ? (
                          <Badge className={`${getGradeColor(liveGrade)} text-[10px] px-2 py-0.5`}>
                            {liveGrade}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            -
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          id={`inline-teacherComment-${idx}`}
                          type="text"
                          placeholder="Optional comment..."
                          disabled={!canEditMarks}
                          value={item.teacherComment}
                          onChange={(e) =>
                            handleInlineChange(p.id, "teacherComment", e.target.value)
                          }
                          onKeyDown={(e) => handleKeyDown(e, idx, "teacherComment")}
                          className="h-8 text-xs bg-background"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.isDirty ? (
                            <Badge
                              variant="secondary"
                              className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]"
                            >
                              Modified
                            </Badge>
                          ) : item.markId ? (
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] gap-1"
                            >
                              <Check className="h-3 w-3" /> Saved
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Empty
                            </Badge>
                          )}
                          {item.markId && canEditMarks && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                              onClick={() =>
                                handleDelete(item.markId!, `${p.firstName} ${p.lastName}`)
                              }
                              title="Delete mark"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {classStudents.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={isAdmin ? 8 : 7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No students in this class. Select a class to enter marks.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {canEditMarks && classStudents.length > 0 && (
            <div className="flex items-center justify-between pt-4 mt-2 border-t">
              <div className="text-xs text-muted-foreground">
                Tip: Press{" "}
                <kbd className="px-1.5 py-0.5 bg-muted rounded border text-[10px] font-mono">
                  Enter
                </kbd>{" "}
                or{" "}
                <kbd className="px-1.5 py-0.5 bg-muted rounded border text-[10px] font-mono">↓</kbd>{" "}
                in the score box to jump quickly to the next student.
              </div>
              <Button
                size="sm"
                onClick={handleSaveAllInlineMarks}
                disabled={isSaving || dirtyCount === 0}
                className={dirtyCount > 0 ? "bg-primary shadow-sm" : ""}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving Marks...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save All Marks {dirtyCount > 0 && `(${dirtyCount})`}
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Mark</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-score">Score</Label>
                <Input
                  id="edit-score"
                  type="number"
                  min="0"
                  value={formData.score}
                  onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                  onKeyDown={(e) => handleKeyDownForm(e, true)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-max">Max Score</Label>
                <Input
                  id="edit-max"
                  type="number"
                  min="1"
                  value={formData.maxScore}
                  onChange={(e) => setFormData({ ...formData, maxScore: e.target.value })}
                  onKeyDown={(e) => handleKeyDownForm(e, true)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-comment">Teacher Comment (Optional)</Label>
              <Textarea
                id="edit-comment"
                value={formData.teacherComment}
                onChange={(e) => setFormData({ ...formData, teacherComment: e.target.value })}
                onKeyDown={(e) => handleKeyDownForm(e, true)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditMark}>Update Mark</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Student Marks Sheet Preview Dialog */}
      <Dialog open={sheetDialogOpen} onOpenChange={setSheetDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b gap-3">
            <div>
              <DialogTitle className="text-xl font-bold">
                {currentSchool?.name || "Noble Edu"} - Student Marks Sheet
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Class:{" "}
                <span className="font-semibold text-foreground">
                  {currentClass?.name || "All Classes"}
                </span>{" "}
                | Term: <span className="font-semibold text-foreground">{term}</span> | Year:{" "}
                <span className="font-semibold text-foreground">{year}</span>
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
                  const classNameStr = currentClass?.name || "All_Classes";
                  downloadCSV(
                    `Marks_Sheet_${classNameStr.replace(/\s+/g, "_")}_${term}_${year}`,
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
              {!isTeacher && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-semibold">Class:</Label>
                  <Select value={classId} onValueChange={setClassId}>
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
              )}
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
              <span className="font-semibold text-foreground">{classStudents.length}</span>
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
            <Button variant="outline" onClick={() => setSheetDialogOpen(false)}>
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
