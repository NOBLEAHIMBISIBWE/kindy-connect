import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useStore, type ClassRoom } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Edit2, Trash2, BookMarked, Check, Layers, AlertCircle } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/classes")({
  head: () => ({ meta: [{ title: "Classes - Noble Edu" }] }),
  component: ClassesPage,
});

function ClassesPage() {
  const {
    currentUser,
    classes = [],
    users = [],
    students = [],
    schools = [],
    addClass,
    updateClass,
    deleteClass,
    getSchoolSubjects,
    loading = false,
  } = useStore();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);

  // Dedicated manage subjects modal
  const [manageSubjectsOpen, setManageSubjectsOpen] = useState(false);
  const [managingClass, setManagingClass] = useState<ClassRoom | null>(null);
  const [classSubjectsForm, setClassSubjectsForm] = useState<string[]>([]);

  const isSuperAdmin = currentUser?.role === "super_admin";
  const isAuthorized =
    isSuperAdmin || currentUser?.role === "admin" || currentUser?.role === "deputy";

  // Super Admin School filtering
  const [superSchoolId, setSuperSchoolId] = useState<string>(schools?.[0]?.id ?? "");

  // Active target school ID for subject loading
  const activeSchoolId = isSuperAdmin
    ? open
      ? formSchoolId()
      : editingClass
        ? editingClass.schoolId
        : superSchoolId
    : (currentUser?.schoolId ?? schools?.[0]?.id ?? "");

  function formSchoolId() {
    return form.schoolId || superSchoolId || currentUser?.schoolId || schools?.[0]?.id || "";
  }

  // Available subjects for the active school context
  const schoolSubjects = useMemo(() => {
    return getSchoolSubjects(activeSchoolId);
  }, [getSchoolSubjects, activeSchoolId]);

  const availableSubjectNames = useMemo(() => {
    return (schoolSubjects || []).map((s) => s.name);
  }, [schoolSubjects]);

  // Form states
  const [form, setForm] = useState<{
    name: string;
    teacherId: string;
    schoolId: string;
    subjects: string[];
  }>({
    name: "",
    teacherId: "",
    schoolId: currentUser?.schoolId ?? schools?.[0]?.id ?? "",
    subjects: [],
  });

  const [editForm, setEditForm] = useState<{
    name: string;
    teacherId: string;
    subjects: string[];
  }>({
    name: "",
    teacherId: "",
    subjects: [],
  });

  // When opening Create Class dialog, pre-select available school subjects by default
  useEffect(() => {
    if (open) {
      const subjs = (
        getSchoolSubjects(
          isSuperAdmin ? form.schoolId || schools?.[0]?.id : currentUser?.schoolId,
        ) || []
      ).map((s) => s.name);
      setForm((prev) => ({
        ...prev,
        subjects: subjs,
      }));
    }
  }, [open, isSuperAdmin, form.schoolId, currentUser?.schoolId, schools, getSchoolSubjects]);

  // Filter classes to display
  const classesToDisplay = useMemo(() => {
    let list = classes;
    if (isSuperAdmin) {
      list = list.filter((c) => c.schoolId === superSchoolId);
    }
    return list.filter((c) => c && c.name && c.name.toLowerCase().includes(q.toLowerCase()));
  }, [classes, isSuperAdmin, superSchoolId, q]);

  // List of teachers for the selected school
  const teachers = useMemo(() => {
    const targetSchoolId = isSuperAdmin
      ? open
        ? form.schoolId
        : (editingClass?.schoolId ?? "")
      : (currentUser?.schoolId ?? "");
    return users.filter(
      (u) => u.role === "teacher" && u.status === "verified" && u.schoolId === targetSchoolId,
    );
  }, [users, isSuperAdmin, open, form.schoolId, editingClass, currentUser]);

  const submitCreate = async () => {
    const className = form.name.trim();
    if (!className) return toast.error("Class name is required");
    const targetSchoolId = isSuperAdmin ? form.schoolId : (currentUser?.schoolId ?? "");
    if (!targetSchoolId) return toast.error("School is required");

    // Duplicate class name check within school
    if (
      classes.some(
        (c) =>
          c.schoolId === targetSchoolId && c.name.trim().toLowerCase() === className.toLowerCase(),
      )
    ) {
      return toast.error(`Class '${className}' already exists in this school`);
    }

    try {
      await addClass({
        name: className,
        schoolId: targetSchoolId,
        teacherId: form.teacherId || undefined,
        subjects: form.subjects,
      });

      toast.success(
        `Classroom "${className}" created with ${form.subjects.length} assigned subject(s)`,
      );
      setOpen(false);
      setForm({
        name: "",
        teacherId: "",
        schoolId: currentUser?.schoolId ?? schools?.[0]?.id ?? "",
        subjects: [],
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to create class");
    }
  };

  const startEdit = (cls: ClassRoom) => {
    setEditingClass(cls);
    const targetSchoolSubjs = getSchoolSubjects(cls.schoolId).map((s) => s.name);
    const currentClassSubjs =
      cls.subjects && cls.subjects.length > 0 ? cls.subjects : targetSchoolSubjs;
    setEditForm({
      name: cls.name,
      teacherId: cls.teacherId || "",
      subjects: currentClassSubjs,
    });
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editingClass) return;
    const className = editForm.name.trim();
    if (!className) return toast.error("Class name is required");

    // Duplicate class name check within school
    if (
      className.toLowerCase() !== editingClass.name.trim().toLowerCase() &&
      classes.some(
        (c) =>
          c.schoolId === editingClass.schoolId &&
          c.name.trim().toLowerCase() === className.toLowerCase(),
      )
    ) {
      return toast.error(`Class '${className}' already exists in this school`);
    }

    try {
      await updateClass(editingClass.id, {
        name: className,
        teacherId: editForm.teacherId || undefined,
        subjects: editForm.subjects,
      });

      toast.success("Classroom updated successfully");
      setEditOpen(false);
      setEditingClass(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update class");
    }
  };

  const startManageSubjects = (cls: ClassRoom) => {
    setManagingClass(cls);
    const targetSchoolSubjs = getSchoolSubjects(cls.schoolId).map((s) => s.name);
    const currentClassSubjs =
      cls.subjects && cls.subjects.length > 0 ? cls.subjects : targetSchoolSubjs;
    setClassSubjectsForm(currentClassSubjs);
    setManageSubjectsOpen(true);
  };

  const submitManageSubjects = async () => {
    if (!managingClass) return;

    await updateClass(managingClass.id, {
      subjects: classSubjectsForm,
    });

    toast.success(`Assigned ${classSubjectsForm.length} subjects to ${managingClass.name}`);
    setManageSubjectsOpen(false);
    setManagingClass(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? Teachers assigned will be unlinked.`)) {
      await deleteClass(id);
      toast.success("Classroom deleted successfully");
    }
  };

  if (loading && !currentUser) {
    return (
      <AppShell title="Classrooms">
        <div className="min-h-[50vh] flex flex-col items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading classes...</p>
        </div>
      </AppShell>
    );
  }

  if (!isAuthorized) {
    return (
      <AppShell title="Unauthorized">
        <div className="text-center py-12 text-muted-foreground">
          You do not have permission to access classroom management.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Classrooms">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          {/* Filters and Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5 justify-between">
            <div className="flex flex-1 flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search classes..."
                  className="pl-9"
                />
              </div>

              {isSuperAdmin && (
                <div className="flex items-center gap-2">
                  <Label className="shrink-0 text-sm">School Filter:</Label>
                  <select
                    value={superSchoolId}
                    onChange={(e) => setSuperSchoolId(e.target.value)}
                    className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {(schools || []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-1">
                  <Plus className="h-4 w-4" /> Create Class
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create new classroom</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  {isSuperAdmin && (
                    <div>
                      <Label htmlFor="school">School</Label>
                      <select
                        id="school"
                        value={form.schoolId}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            schoolId: e.target.value,
                            teacherId: "",
                            subjects: [],
                          })
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1"
                      >
                        {(schools || []).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="name">Class Name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Sunflower Class"
                    />
                  </div>
                  <div>
                    <Label htmlFor="teacher">Class Teacher (Optional)</Label>
                    <select
                      id="teacher"
                      value={form.teacherId}
                      onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1"
                    >
                      <option value="">Unassigned</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subjects Selection */}
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-semibold flex items-center gap-1.5">
                        <BookMarked className="h-4 w-4 text-primary" /> Subjects Taught
                      </Label>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, subjects: [...availableSubjectNames] })}
                          className="text-primary hover:underline font-medium"
                        >
                          Select All
                        </button>
                        <span className="text-muted-foreground">|</span>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, subjects: [] })}
                          className="text-muted-foreground hover:underline"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      Check the subjects done by this classroom. ({form.subjects.length} of{" "}
                      {availableSubjectNames.length} selected)
                    </div>
                    <div className="max-h-44 overflow-y-auto border rounded-md p-2.5 space-y-1.5 bg-muted/20">
                      {availableSubjectNames.map((subj) => {
                        const isChecked = form.subjects.includes(subj);
                        return (
                          <label
                            key={subj}
                            className="flex items-center gap-2.5 text-xs font-medium cursor-pointer hover:bg-background/80 p-1.5 rounded-md transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setForm({ ...form, subjects: [...form.subjects, subj] });
                                } else {
                                  setForm({
                                    ...form,
                                    subjects: form.subjects.filter((s) => s !== subj),
                                  });
                                }
                              }}
                              className="rounded text-primary focus:ring-primary h-4 w-4"
                            />
                            <span>{subj}</span>
                          </label>
                        );
                      })}
                      {availableSubjectNames.length === 0 && (
                        <div className="text-xs text-muted-foreground text-center py-4">
                          No subjects configured for this school yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={submitCreate}>Save Class</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Classes Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class Name</TableHead>
                {isSuperAdmin && <TableHead>School</TableHead>}
                <TableHead>Assigned Teacher</TableHead>
                <TableHead>Subjects Done</TableHead>
                <TableHead>Total Students</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classesToDisplay.map((c) => {
                const schoolName = schools.find((s) => s.id === c.schoolId)?.name || "N/A";
                const teacherName = users.find((u) => u.id === c.teacherId)?.name || "Unassigned";
                const classStudentsCount = students.filter(
                  (p) => p.classId === c.id && p.active,
                ).length;
                const schoolSubjs = getSchoolSubjects(c.schoolId).map((s) => s.name);
                const classSubjs = c.subjects && c.subjects.length > 0 ? c.subjects : schoolSubjs;

                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-semibold">{c.name}</TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-muted-foreground text-sm">{schoolName}</TableCell>
                    )}
                    <TableCell>{teacherName}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1 max-w-xs">
                        {classSubjs.length > 0 ? (
                          <>
                            {classSubjs.slice(0, 3).map((sub) => (
                              <Badge
                                key={sub}
                                variant="secondary"
                                className="text-[11px] font-normal py-0 px-1.5"
                              >
                                {sub}
                              </Badge>
                            ))}
                            {classSubjs.length > 3 && (
                              <Badge
                                variant="outline"
                                className="text-[11px] font-normal py-0 px-1 text-muted-foreground"
                              >
                                +{classSubjs.length - 3} more
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                            <AlertCircle className="h-3 w-3" /> None assigned
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{classStudentsCount} students</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1"
                        onClick={() => startManageSubjects(c)}
                        title="Manage Subjects"
                      >
                        <BookMarked className="h-3.5 w-3.5 text-primary" />
                        <span className="hidden sm:inline">Subjects</span>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => startEdit(c)}
                      >
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleDelete(c.id, c.name)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {classesToDisplay.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={isSuperAdmin ? 6 : 5}
                    className="text-center text-muted-foreground py-8"
                  >
                    No classes found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Edit Dialog */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Classroom - {editingClass?.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label htmlFor="edit-name">Class Name</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-teacher">Class Teacher</Label>
                  <select
                    id="edit-teacher"
                    value={editForm.teacherId}
                    onChange={(e) => setEditForm({ ...editForm, teacherId: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1"
                  >
                    <option value="">Unassigned</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Edit Class Subjects */}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <BookMarked className="h-4 w-4 text-primary" /> Subjects Taught
                    </Label>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setEditForm({
                            ...editForm,
                            subjects: [
                              ...getSchoolSubjects(editingClass?.schoolId).map((s) => s.name),
                            ],
                          })
                        }
                        className="text-primary hover:underline font-medium"
                      >
                        Select All
                      </button>
                      <span className="text-muted-foreground">|</span>
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, subjects: [] })}
                        className="text-muted-foreground hover:underline"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    ({editForm.subjects.length} selected)
                  </div>
                  <div className="max-h-44 overflow-y-auto border rounded-md p-2.5 space-y-1.5 bg-muted/20">
                    {getSchoolSubjects(editingClass?.schoolId).map((s) => {
                      const subjName = s.name;
                      const isChecked = editForm.subjects.includes(subjName);
                      return (
                        <label
                          key={subjName}
                          className="flex items-center gap-2.5 text-xs font-medium cursor-pointer hover:bg-background/80 p-1.5 rounded-md transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditForm({
                                  ...editForm,
                                  subjects: [...editForm.subjects, subjName],
                                });
                              } else {
                                setEditForm({
                                  ...editForm,
                                  subjects: editForm.subjects.filter((item) => item !== subjName),
                                });
                              }
                            }}
                            className="rounded text-primary focus:ring-primary h-4 w-4"
                          />
                          <span>{subjName}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={submitEdit}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dedicated Manage Subjects Dialog */}
          <Dialog open={manageSubjectsOpen} onOpenChange={setManageSubjectsOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BookMarked className="h-5 w-5 text-primary" />
                  Manage Subjects - {managingClass?.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Select which subjects {managingClass?.name} does:
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setClassSubjectsForm(
                          getSchoolSubjects(managingClass?.schoolId).map((s) => s.name),
                        )
                      }
                      className="text-primary hover:underline font-medium"
                    >
                      Select All
                    </button>
                    <span className="text-muted-foreground">|</span>
                    <button
                      type="button"
                      onClick={() => setClassSubjectsForm([])}
                      className="text-muted-foreground hover:underline"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-2 bg-muted/20">
                  {getSchoolSubjects(managingClass?.schoolId).map((s) => {
                    const subjName = s.name;
                    const isChecked = classSubjectsForm.includes(subjName);
                    return (
                      <label
                        key={subjName}
                        className="flex items-center gap-2.5 text-xs font-medium cursor-pointer hover:bg-background/80 p-1.5 rounded-md transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setClassSubjectsForm([...classSubjectsForm, subjName]);
                            } else {
                              setClassSubjectsForm(
                                classSubjectsForm.filter((item) => item !== subjName),
                              );
                            }
                          }}
                          className="rounded text-primary focus:ring-primary h-4 w-4"
                        />
                        <span>{subjName}</span>
                      </label>
                    );
                  })}
                  {getSchoolSubjects(managingClass?.schoolId).length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-4">
                      No subjects configured for this school yet.
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Selected {classSubjectsForm.length} subject(s)
                </div>
              </div>
              <DialogFooter>
                <Button onClick={submitManageSubjects}>Save Class Subjects</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </AppShell>
  );
}
