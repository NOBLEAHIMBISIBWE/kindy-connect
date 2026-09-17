import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useStore, type Pupil } from "@/lib/store";
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
import { Plus, Search, Edit, Upload } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { BulkUploadPupilsDialog } from "@/components/bulk-upload-pupils-dialog";

export const Route = createFileRoute("/app/pupils")({
  head: () => ({ meta: [{ title: "Pupils - Noble Edu" }] }),
  component: PupilsPage,
});

function PupilsPage() {
  const {
    currentUser,
    pupils = [],
    classes = [],
    parents = [],
    addPupil,
    updatePupil,
    deactivatePupil,
    schools = [],
    loading = false,
  } = useStore();
  const isAdmin = currentUser?.role === "super_admin" || currentUser?.role === "admin";
  const [q, setQ] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");
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

  const [open, setOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Ensure only one dialog is open at a time to prevent Portal conflicts
  const openCreateDialog = () => {
    setBulkUploadOpen(false);
    setEditOpen(false);
    setOpen(true);
  };

  const openBulkUploadDialog = () => {
    setOpen(false);
    setEditOpen(false);
    setBulkUploadOpen(true);
  };

  const openEditDialog = (pupil: Pupil) => {
    setOpen(false);
    setBulkUploadOpen(false);
    setEditingPupil(pupil);
    setEditForm({
      admissionNo: pupil.admissionNo,
      firstName: pupil.firstName,
      lastName: pupil.lastName,
      gender: pupil.gender,
      dob: pupil.dob,
      classId: pupil.classId,
      photo: pupil.photo || "",
    });
    setEditOpen(true);
  };
  const [editingPupil, setEditingPupil] = useState<Pupil | null>(null);
  const [form, setForm] = useState({
    admissionNo: "",
    firstName: "",
    lastName: "",
    gender: "M" as "M" | "F",
    dob: "",
    classId: filteredClasses?.[0]?.id ?? classes?.[0]?.id ?? "",
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    parentRelationship: "Mother",
    photo: "",
  });
  const [editForm, setEditForm] = useState({
    admissionNo: "",
    firstName: "",
    lastName: "",
    gender: "M" as "M" | "F",
    dob: "",
    classId: "",
    photo: "",
  });

  const filtered = pupils.filter((p) => {
    const matchesClass = selectedClassFilter === "all" || p.classId === selectedClassFilter;
    const matchesQuery = `${p.firstName} ${p.lastName} ${p.admissionNo}`
      .toLowerCase()
      .includes(q.toLowerCase());
    return matchesClass && matchesQuery;
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm({ ...form, photo: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditForm({ ...editForm, photo: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    const admNo = form.admissionNo.trim();
    const fName = form.firstName.trim();
    const lName = form.lastName.trim();

    if (!admNo || !fName || !lName) return toast.error("Fill required fields");
    if (pupils.some((p) => p.admissionNo.trim().toLowerCase() === admNo.toLowerCase()))
      return toast.error(`Admission number '${admNo}' already exists`);

    // Check duplicate pupil in class
    if (
      pupils.some(
        (p) =>
          p.classId === form.classId &&
          p.firstName.trim().toLowerCase() === fName.toLowerCase() &&
          p.lastName.trim().toLowerCase() === lName.toLowerCase(),
      )
    ) {
      return toast.error(`Pupil '${fName} ${lName}' already exists in this class`);
    }

    if (!form.parentName || !form.parentPhone || !form.parentEmail) {
      return toast.error("Parent / guardian details are required");
    }

    try {
      await addPupil({
        admissionNo: admNo,
        firstName: fName,
        lastName: lName,
        gender: form.gender,
        dob: form.dob,
        classId: form.classId,
        photo: form.photo || undefined,
        parentIds: [],
        parent: {
          name: form.parentName.trim(),
          phone: form.parentPhone.trim(),
          email: form.parentEmail.trim(),
          relationship: form.parentRelationship,
        },
      } as any);
      toast.success("Pupil registered successfully and saved to database");
      setOpen(false);
      setForm({
        admissionNo: "",
        firstName: "",
        lastName: "",
        gender: "M",
        dob: "",
        classId: classes[0]?.id ?? "",
        parentName: "",
        parentPhone: "",
        parentEmail: "",
        parentRelationship: "Mother",
        photo: "",
      });
    } catch (error: any) {
      console.error("Error saving pupil:", error);
      toast.error(`Failed to save pupil: ${error.message || "Unknown error"}`);
    }
  };

  // Safe dialog close handlers
  const handleCloseCreate = (open: boolean) => {
    if (!open) {
      setOpen(false);
    }
  };

  const handleCloseEdit = (open: boolean) => {
    if (!open) {
      setEditOpen(false);
      setEditingPupil(null);
    }
  };

  const handleCloseBulkUpload = (open: boolean) => {
    if (!open) {
      setBulkUploadOpen(false);
    }
  };

  const submitEdit = async () => {
    if (!editingPupil) return;
    const admNo = editForm.admissionNo.trim();
    const fName = editForm.firstName.trim();
    const lName = editForm.lastName.trim();

    if (!admNo || !fName || !lName) {
      return toast.error("Fill required fields");
    }

    // Check if admission number changed and is already taken
    if (
      admNo.toLowerCase() !== editingPupil.admissionNo.trim().toLowerCase() &&
      pupils.some((p) => p.admissionNo.trim().toLowerCase() === admNo.toLowerCase())
    ) {
      return toast.error(`Admission number '${admNo}' already exists`);
    }

    // Check duplicate pupil in class
    if (
      pupils.some(
        (p) =>
          p.id !== editingPupil.id &&
          p.classId === editForm.classId &&
          p.firstName.trim().toLowerCase() === fName.toLowerCase() &&
          p.lastName.trim().toLowerCase() === lName.toLowerCase(),
      )
    ) {
      return toast.error(`Pupil '${fName} ${lName}' already exists in this class`);
    }

    await updatePupil(editingPupil.id, {
      admissionNo: admNo,
      firstName: fName,
      lastName: lName,
      gender: editForm.gender,
      dob: editForm.dob,
      classId: editForm.classId,
      photo: editForm.photo || undefined,
    });

    toast.success(`${fName} ${lName} updated successfully`);
    setEditOpen(false);
    setEditingPupil(null);
  };

  if (loading && !currentUser) {
    return (
      <AppShell title="Pupils">
        <div className="min-h-[50vh] flex flex-col items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading pupils...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Pupils">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            {currentUser?.role === "super_admin" && (
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
            )}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name or admission no..."
                className="pl-9"
              />
            </div>
            <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {filteredClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={openBulkUploadDialog}>
              <Upload className="h-4 w-4 mr-1" /> Bulk Upload
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-1" /> Register pupil
            </Button>
            <Dialog open={open} onOpenChange={handleCloseCreate}>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Register new pupil</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3 pr-2">
                  <div className="col-span-2">
                    <Label>Admission number</Label>
                    <Input
                      value={form.admissionNo}
                      onChange={(e) => setForm({ ...form, admissionNo: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>First name</Label>
                    <Input
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Last name</Label>
                    <Input
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <Select
                      value={form.gender}
                      onValueChange={(v) => setForm({ ...form, gender: v as "M" | "F" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Male</SelectItem>
                        <SelectItem value="F">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date of birth</Label>
                    <Input
                      type="date"
                      value={form.dob}
                      onChange={(e) => setForm({ ...form, dob: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Class</Label>
                    <Select
                      value={form.classId}
                      onValueChange={(v) => setForm({ ...form, classId: v })}
                    >
                      <SelectTrigger>
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
                  </div>
                  <div className="col-span-2">
                    <Label>Photo</Label>
                    <Input type="file" accept="image/*" onChange={handlePhotoChange} />
                    {form.photo && (
                      <div className="mt-2">
                        <img
                          src={form.photo}
                          alt="Preview"
                          className="w-24 h-24 object-cover rounded-md border"
                        />
                      </div>
                    )}
                  </div>
                  <div className="col-span-2 rounded-xl border p-3 space-y-3 bg-muted/20">
                    <div className="text-sm font-medium">
                      Parent / guardian details <span className="text-destructive">*</span>
                    </div>
                    <div>
                      <Label>
                        Full name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={form.parentName}
                        onChange={(e) => setForm({ ...form, parentName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>
                        Phone <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={form.parentPhone}
                        onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
                        placeholder="+254..."
                      />
                    </div>
                    <div>
                      <Label>
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="email"
                        value={form.parentEmail}
                        onChange={(e) => setForm({ ...form, parentEmail: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>
                        Relationship <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={form.parentRelationship}
                        onValueChange={(v) => setForm({ ...form, parentRelationship: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mother">Mother</SelectItem>
                          <SelectItem value="Father">Father</SelectItem>
                          <SelectItem value="Guardian">Guardian</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={submit}>Save pupil</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Photo</TableHead>
                {isAdmin && <TableHead>Adm. No</TableHead>}
                <TableHead>Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Guardians</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.photo ? (
                      <img
                        src={p.photo}
                        alt={`${p.firstName} ${p.lastName}`}
                        className="w-10 h-10 object-cover rounded-full border"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {p.firstName[0]}
                        {p.lastName[0]}
                      </div>
                    )}
                  </TableCell>
                  {isAdmin && <TableCell className="font-mono text-xs">{p.admissionNo}</TableCell>}
                  <TableCell className="font-medium">
                    {p.firstName} {p.lastName}
                  </TableCell>
                  <TableCell>{classes.find((c) => c.id === p.classId)?.name ?? "-"}</TableCell>
                  <TableCell>{p.gender === "M" ? "Male" : "Female"}</TableCell>
                  <TableCell>{p.parentIds.length}</TableCell>
                  <TableCell>
                    {p.active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => openEditDialog(p)}>
                      <Edit className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    {p.active && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          deactivatePupil(p.id);
                          toast.success("Pupil deactivated");
                        }}
                      >
                        Deactivate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Pupil Dialog */}
      <Dialog open={editOpen} onOpenChange={handleCloseEdit}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Pupil Details</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Admission number</Label>
              <Input
                value={editForm.admissionNo}
                onChange={(e) => setEditForm({ ...editForm, admissionNo: e.target.value })}
              />
            </div>
            <div>
              <Label>First name</Label>
              <Input
                value={editForm.firstName}
                onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
              />
            </div>
            <div>
              <Label>Last name</Label>
              <Input
                value={editForm.lastName}
                onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
              />
            </div>
            <div>
              <Label>Gender</Label>
              <Select
                value={editForm.gender}
                onValueChange={(v) => setEditForm({ ...editForm, gender: v as "M" | "F" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Male</SelectItem>
                  <SelectItem value="F">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date of birth</Label>
              <Input
                type="date"
                value={editForm.dob}
                onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>Class</Label>
              <Select
                value={editForm.classId}
                onValueChange={(v) => setEditForm({ ...editForm, classId: v })}
              >
                <SelectTrigger>
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
            </div>
            <div className="col-span-2">
              <Label>Photo</Label>
              <Input type="file" accept="image/*" onChange={handleEditPhotoChange} />
              {editForm.photo && (
                <div className="mt-2">
                  <img
                    src={editForm.photo}
                    alt="Preview"
                    className="w-24 h-24 object-cover rounded-md border"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <BulkUploadPupilsDialog open={bulkUploadOpen} onOpenChange={handleCloseBulkUpload} />
    </AppShell>
  );
}
