import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/app/marks")({
  head: () => ({ meta: [{ title: "Marks & Grades - Little Stars" }] }),
  component: MarksPage,
});

function MarksPage() {
  const { currentUser, pupils, classes, marks, addMark, updateMark, deleteMark } = useStore();
  const isTeacher = currentUser?.role === "teacher";
  const defaultClass = isTeacher ? currentUser?.classId ?? classes[0]?.id : classes[0]?.id;
  const [classId, setClassId] = useState<string>(defaultClass ?? "");
  const [term, setTerm] = useState("Term 2");
  const [year, setYear] = useState("2025");
  const [subject, setSubject] = useState("Reading");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPupilId, setSelectedPupilId] = useState("");
  const [editingMark, setEditingMark] = useState<any>(null);
  const [formData, setFormData] = useState({
    score: "",
    maxScore: "100",
    teacherComment: "",
  });

  const classPupils = pupils.filter((p) => p.classId === classId && p.active);
  const filteredMarks = marks.filter(
    (m) => m.term === term && m.year === year && m.subject === subject
  );

  const subjects = ["Reading", "Math", "Writing", "Art", "Music", "Physical Education", "Science"];
  const terms = ["Term 1", "Term 2", "Term 3"];

  const handleAddMark = async () => {
    if (!selectedPupilId || !formData.score || !formData.maxScore) {
      toast.error("Please fill in all required fields");
      return;
    }

    const pupil = classPupils.find((p) => p.id === selectedPupilId);
    const existingMark = marks.find(
      (m) => m.pupilId === selectedPupilId && m.subject === subject && m.term === term && m.year === year
    );

    if (existingMark) {
      toast.error("Mark already exists for this pupil in this subject and term");
      return;
    }

    await addMark({
      pupilId: selectedPupilId,
      subject,
      term,
      year,
      score: parseFloat(formData.score),
      maxScore: parseFloat(formData.maxScore),
      teacherComment: formData.teacherComment,
    });

    toast.success(`Mark added for ${pupil?.firstName} ${pupil?.lastName}`);
    setAddDialogOpen(false);
    setSelectedPupilId("");
    setFormData({ score: "", maxScore: "100", teacherComment: "" });
  };

  const handleEditMark = async () => {
    if (!editingMark || !formData.score || !formData.maxScore) {
      toast.error("Please fill in all required fields");
      return;
    }

    await updateMark(editingMark.id, {
      score: parseFloat(formData.score),
      maxScore: parseFloat(formData.maxScore),
      teacherComment: formData.teacherComment,
    });

    const pupil = classPupils.find((p) => p.id === editingMark.pupilId);
    toast.success(`Mark updated for ${pupil?.firstName} ${pupil?.lastName}`);
    setEditDialogOpen(false);
    setEditingMark(null);
    setFormData({ score: "", maxScore: "100", teacherComment: "" });
  };

  const handleDelete = async (markId: string, pupilName: string) => {
    if (confirm(`Are you sure you want to delete this mark for ${pupilName}?`)) {
      await deleteMark(markId);
      toast.success("Mark deleted");
    }
  };

  const openEditDialog = (mark: any) => {
    setEditingMark(mark);
    setFormData({
      score: mark.score.toString(),
      maxScore: mark.maxScore.toString(),
      teacherComment: mark.teacherComment || "",
    });
    setEditDialogOpen(true);
  };

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

  return (
    <AppShell title="Marks & Grades">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>Student Marks</CardTitle>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Mark
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Mark</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-pupil">Pupil</Label>
                    <Select value={selectedPupilId} onValueChange={setSelectedPupilId}>
                      <SelectTrigger id="add-pupil">
                        <SelectValue placeholder="Select pupil" />
                      </SelectTrigger>
                      <SelectContent>
                        {classPupils.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.firstName} {p.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="add-score">Score</Label>
                      <Input
                        id="add-score"
                        type="number"
                        min="0"
                        value={formData.score}
                        onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                        placeholder="e.g., 85"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="add-max">Max Score</Label>
                      <Input
                        id="add-max"
                        type="number"
                        min="1"
                        value={formData.maxScore}
                        onChange={(e) => setFormData({ ...formData, maxScore: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-comment">Teacher Comment (Optional)</Label>
                    <Textarea
                      id="add-comment"
                      value={formData.teacherComment}
                      onChange={(e) => setFormData({ ...formData, teacherComment: e.target.value })}
                      placeholder="e.g., Excellent work! Keep it up."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddMark}>Add Mark</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Label>Class:</Label>
              <Select value={classId} onValueChange={setClassId} disabled={isTeacher}>
                <SelectTrigger className="w-40">
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
            <div className="flex items-center gap-2">
              <Label>Subject:</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label>Term:</Label>
              <Select value={term} onValueChange={setTerm}>
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
            <div className="flex items-center gap-2">
              <Label>Year:</Label>
              <Input
                type="number"
                className="w-24"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pupil</TableHead>
                <TableHead>Admission No</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classPupils.map((p) => {
                const mark = filteredMarks.find((m) => m.pupilId === p.id);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.firstName} {p.lastName}
                    </TableCell>
                    <TableCell>{p.admissionNo}</TableCell>
                    <TableCell>
                      {mark ? `${mark.score}/${mark.maxScore}` : "-"}
                    </TableCell>
                    <TableCell>
                      {mark ? (
                        <Badge className={getGradeColor(mark.grade || "")}>{mark.grade}</Badge>
                      ) : (
                        <Badge variant="secondary">Not graded</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {mark?.teacherComment || "-"}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {mark ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(mark)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(mark.id, `${p.firstName} ${p.lastName}`)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-muted-foreground text-sm">No mark</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {classPupils.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No pupils in this class.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-comment">Teacher Comment (Optional)</Label>
              <Textarea
                id="edit-comment"
                value={formData.teacherComment}
                onChange={(e) => setFormData({ ...formData, teacherComment: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditMark}>Update Mark</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
