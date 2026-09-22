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
import { Plus, Search, Edit, Upload, Download, Calendar, Users, Eye, MoreHorizontal } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BulkUploadPupilsDialog } from "@/components/bulk-upload-pupils-dialog";

export const Route = createFileRoute("/app/pupils")({
  head: () => ({ meta: [{ title: "Pupils - Noble Edu" }] }),
  component: PupilsPage,
});

function PupilsPage() {
  // Helper functions
  const calculateAge = (dob: string) => {
    try {
      return differenceInYears(new Date(), parseISO(dob));
    } catch {
      return 0;
    }
  };

  const exportPupilsData = () => {
    const csvContent = [
      ["Admission No", "First Name", "Last Name", "Gender", "Date of Birth", "Age", "Class", "Status", "Parents Count"],
      ...filtered.map(p => [
        p.admissionNo,
        p.firstName,
        p.lastName,
        p.gender === "M" ? "Male" : "Female",
        p.dob,
        calculateAge(p.dob).toString(),
        classes.find(c => c.id === p.classId)?.name || "-",
        p.active ? "Active" : "Inactive",
        p.parentIds.length.toString()
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `pupils_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Pupils data exported successfully");
  };
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
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<string>("all");
  const [superSchoolId, setSuperSchoolId] = useState<string>(schools?.[0]?.id ?? "");

  // Statistics
  const stats = useMemo(() => {
    const activePupils = pupils.filter(p => p.active);
    const maleCount = activePupils.filter(p => p.gender === "M").length;
    const femaleCount = activePupils.filter(p => p.gender === "F").length;
    const classStats = filteredClasses.map(c => ({
      className: c.name,
      count: activePupils.filter(p => p.classId === c.id).length
    }));
    
    return {
      total: pupils.length,
      active: activePupils.length,
      inactive: pupils.length - activePupils.length,
      male: maleCount,
      female: femaleCount,
      classStats
    };
  }, [pupils, filteredClasses]);

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
  const [profileOpen, setProfileOpen] = useState(false);
  const [viewingPupil, setViewingPupil] = useState<Pupil | null>(null);

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
    setProfileOpen(false);
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

  const openProfileDialog = (pupil: Pupil) => {
    setOpen(false);
    setBulkUploadOpen(false);
    setEditOpen(false);
    setViewingPupil(pupil);
    setProfileOpen(true);
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
    const matchesStatus = selectedStatusFilter === "all" || 
      (selectedStatusFilter === "active" && p.active) || 
      (selectedStatusFilter === "inactive" && !p.active);
    const matchesGender = selectedGenderFilter === "all" || p.gender === selectedGenderFilter;
    const matchesQuery = `${p.firstName} ${p.lastName} ${p.admissionNo}`
      .toLowerCase()
      .includes(q.toLowerCase());
    return matchesClass && matchesStatus && matchesGender && matchesQuery;
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

    // Enhanced validation with specific error messages
    if (!admNo) return toast.error("Admission number is required");
    if (!fName) return toast.error("First name is required");
    if (!lName) return toast.error("Last name is required");
    if (!form.dob) return toast.error("Date of birth is required");
    if (!form.classId) return toast.error("Class selection is required");
    
    // Validate date of birth
    const dobDate = new Date(form.dob);
    const today = new Date();
    const age = differenceInYears(today, dobDate);
    
    if (dobDate > today) {
      return toast.error("Date of birth cannot be in the future");
    }
    
    if (age > 18) {
      return toast.error("Pupil seems too old. Please check the date of birth.");
    }
    
    if (age < 2) {
      return toast.error("Pupil seems too young. Please check the date of birth.");
    }

    // Check for duplicates
    if (pupils.some((p) => p.admissionNo.trim().toLowerCase() === admNo.toLowerCase())) {
      return toast.error(`Admission number '${admNo}' already exists`);
    }

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

    // Parent validation
    if (!form.parentName.trim()) return toast.error("Parent/guardian name is required");
    if (!form.parentPhone.trim()) return toast.error("Parent/guardian phone is required");
    if (!form.parentEmail.trim()) return toast.error("Parent/guardian email is required");
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.parentEmail.trim())) {
      return toast.error("Please enter a valid email address");
    }
    
    // Phone validation (basic)
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(form.parentPhone.trim()) || form.parentPhone.trim().length < 10) {
      return toast.error("Please enter a valid phone number");
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
      toast.success(`${fName} ${lName} registered successfully!`);
      setOpen(false);
      // Reset form
      setForm({
        admissionNo: "",
        firstName: "",
        lastName: "",
        gender: "M",
        dob: "",
        classId: filteredClasses[0]?.id ?? classes[0]?.id ?? "",
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
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pupils</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Male</p>
                <p className="text-2xl font-bold text-blue-600">{stats.male}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                M
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Female</p>
                <p className="text-2xl font-bold text-pink-600">{stats.female}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-sm">
                F
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
            
            <Select value={selectedGenderFilter} onValueChange={setSelectedGenderFilter}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="M">Male</SelectItem>
                <SelectItem value="F">Female</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={exportPupilsData}>
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export pupils data</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
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

          <div className="mb-4 text-sm text-muted-foreground">
            Showing {filtered.length} of {pupils.length} pupils
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Photo</TableHead>
                {isAdmin && <TableHead className="w-24">Adm. No</TableHead>}
                <TableHead>Name</TableHead>
                <TableHead className="w-20">Age</TableHead>
                <TableHead>Class</TableHead>
                <TableHead className="w-16">Gender</TableHead>
                <TableHead className="w-20">Parents</TableHead>
                <TableHead className="w-20">Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const pupilParents = parents.filter(parent => p.parentIds.includes(parent.id));
                const age = calculateAge(p.dob);
                
                return (
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
                      <div className="flex flex-col">
                        <span>{p.firstName} {p.lastName}</span>
                        <span className="text-xs text-muted-foreground">
                          Born: {format(parseISO(p.dob), "MMM d, yyyy")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {age} yrs
                      </Badge>
                    </TableCell>
                    <TableCell>{classes.find((c) => c.id === p.classId)?.name ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={p.gender === "M" ? "default" : "secondary"} className="text-xs">
                        {p.gender === "M" ? "M" : "F"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-xs cursor-help">
                              {p.parentIds.length}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="max-w-48">
                              {pupilParents.length > 0 ? (
                                pupilParents.map(parent => (
                                  <div key={parent.id} className="text-xs py-1">
                                    <div className="font-medium">{parent.name}</div>
                                    <div className="text-muted-foreground">{parent.relationship} • {parent.phone}</div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-xs">No parent information</div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      {p.active ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(p)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openProfileDialog(p)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {p.active ? (
                            <DropdownMenuItem 
                              onClick={() => {
                                deactivatePupil(p.id);
                                toast.success(`${p.firstName} ${p.lastName} deactivated`);
                              }}
                              className="text-red-600"
                            >
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => {/* TODO: Reactivate */}}>
                              Reactivate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No pupils found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {pupils.length === 0 
                  ? "No pupils have been registered yet." 
                  : "Try adjusting your search or filter criteria."
                }
              </p>
              {pupils.length === 0 && (
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-1" /> Register First Pupil
                </Button>
              )}
            </div>
          )}
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

      {/* Pupil Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={(open) => { if (!open) { setProfileOpen(false); setViewingPupil(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pupil Profile</DialogTitle>
          </DialogHeader>
          {viewingPupil && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="flex items-start gap-4">
                {viewingPupil.photo ? (
                  <img
                    src={viewingPupil.photo}
                    alt={`${viewingPupil.firstName} ${viewingPupil.lastName}`}
                    className="w-24 h-24 object-cover rounded-lg border"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center text-2xl font-medium">
                    {viewingPupil.firstName[0]}{viewingPupil.lastName[0]}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{viewingPupil.firstName} {viewingPupil.lastName}</h3>
                  <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Admission No:</span>
                      <div className="font-mono">{viewingPupil.admissionNo}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <div>
                        {viewingPupil.active ? (
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Gender:</span>
                      <div>{viewingPupil.gender === "M" ? "Male" : "Female"}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Age:</span>
                      <div>{calculateAge(viewingPupil.dob)} years old</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date of Birth:</span>
                      <div>{format(parseISO(viewingPupil.dob), "MMMM d, yyyy")}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Class:</span>
                      <div>{classes.find(c => c.id === viewingPupil.classId)?.name || "-"}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parents/Guardians */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Parents / Guardians
                </h4>
                <div className="grid gap-3">
                  {parents
                    .filter(parent => viewingPupil.parentIds.includes(parent.id))
                    .map(parent => (
                      <Card key={parent.id} className="p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Name:</span>
                            <div className="font-medium">{parent.name}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Relationship:</span>
                            <div>{parent.relationship}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Phone:</span>
                            <div>{parent.phone}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Email:</span>
                            <div className="break-all">{parent.email}</div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  {parents.filter(parent => viewingPupil.parentIds.includes(parent.id)).length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      No parent information available
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {attendance.filter(a => a.pupilId === viewingPupil.id).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Attendance Records</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {/* Add marks calculation here if needed */}
                    0
                  </div>
                  <div className="text-xs text-muted-foreground">Assessment Records</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {viewingPupil.parentIds.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Registered Guardians</div>
                </Card>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => viewingPupil && openEditDialog(viewingPupil)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Details
            </Button>
            <Button onClick={() => setProfileOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <BulkUploadPupilsDialog open={bulkUploadOpen} onOpenChange={handleCloseBulkUpload} />
    </AppShell>
  );
}
