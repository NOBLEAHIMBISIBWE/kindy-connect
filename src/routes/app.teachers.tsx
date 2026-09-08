import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useStore, type User, type Role } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Check,
  X,
  Plus,
  Search,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  Copy,
  GraduationCap,
  Mail,
  Phone,
  Building2,
  Sparkles,
  LayoutGrid,
  List,
  UserPlus,
  UserCheck,
  Clock,
  KeyRound,
  RefreshCw,
  School,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/teachers")({
  head: () => ({ meta: [{ title: "Teachers - Noble Edu Admin" }] }),
  component: TeachersPage,
});

function TeachersPage() {
  const {
    currentUser,
    users = [],
    schools = [],
    classes = [],
    approveTeacher,
    rejectTeacher,
    registerUser,
    updateUser,
    deleteUser,
    getSchoolSubjects,
    loading = false,
    loadError,
    attemptLoad,
  } = useStore();

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [schoolFilter, setSchoolFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [customSubjectInput, setCustomSubjectInput] = useState("");

  const isSuperAdmin = currentUser?.role === "super_admin";
  const isSchoolAdmin = currentUser?.role === "admin";
  const isDeputy = currentUser?.role === "deputy";
  const isTeacher = currentUser?.role === "teacher";
  const isAuthorized = isSuperAdmin || isSchoolAdmin || isDeputy || isTeacher;
  const canManage = isSuperAdmin || isSchoolAdmin;
  const canApprove = isSuperAdmin || isSchoolAdmin || isDeputy;

  // Effective school ID: School admins and teachers are scoped to their own school, super admins can switch
  const effectiveSchoolId = isSuperAdmin
    ? schoolFilter !== "all"
      ? schoolFilter
      : null
    : currentUser?.schoolId || null;

  const safeSchools = useMemo(() => (Array.isArray(schools) ? schools : []), [schools]);
  const safeClasses = useMemo(() => (Array.isArray(classes) ? classes : []), [classes]);
  const safeUsers = useMemo(() => (Array.isArray(users) ? users : []), [users]);

  // Create User Form State
  const [createForm, setCreateForm] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    role: "teacher" as Role,
    schoolId: currentUser?.schoolId ?? safeSchools?.[0]?.id ?? "",
    classId: "",
    password: "",
    subjects: [] as string[],
    photo: "",
  });

  // Edit User Form State
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "teacher" as Role,
    schoolId: "",
    classId: "",
    password: "",
    subjects: [] as string[],
    photo: "",
  });

  // Helper to generate next teacher ID
  const generateTeacherId = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `TCH-${randomNum}`;
  };

  // Helper to generate a friendly secure password
  const generatePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let pwd = "";
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  // Available subjects for Create Modal
  const targetSchoolForSubjects = createForm.schoolId || effectiveSchoolId || currentUser?.schoolId;
  const rawSubjects = useMemo(() => {
    if (typeof getSchoolSubjects === "function") {
      try {
        return getSchoolSubjects(targetSchoolForSubjects) || [];
      } catch (err) {
        console.error("Error getting school subjects:", err);
        return [];
      }
    }
    return [];
  }, [getSchoolSubjects, targetSchoolForSubjects]);

  const availableSubjects = useMemo(() => {
    const fromDb = (Array.isArray(rawSubjects) ? rawSubjects : [])
      .map((s) => (typeof s === "string" ? s : s?.name))
      .filter((s): s is string => Boolean(s) && typeof s === "string");
    const customSubs = Array.isArray(createForm.subjects) ? createForm.subjects : [];
    return Array.from(new Set([...fromDb, ...customSubs]));
  }, [rawSubjects, createForm.subjects]);

  // Available classes for target school
  const scopedClasses = useMemo(() => {
    if (effectiveSchoolId) {
      return safeClasses.filter((c) => c && c.schoolId === effectiveSchoolId);
    }
    return safeClasses;
  }, [safeClasses, effectiveSchoolId]);

  const availableClasses = useMemo(() => {
    const sId = targetSchoolForSubjects;
    if (!sId) return scopedClasses;
    return scopedClasses.filter((c) => c && c.schoolId === sId);
  }, [targetSchoolForSubjects, scopedClasses]);

  // Available subjects for Edit Modal
  const targetEditSchool = editForm.schoolId || effectiveSchoolId || currentUser?.schoolId;
  const rawEditSubjects = useMemo(() => {
    if (typeof getSchoolSubjects === "function") {
      try {
        return getSchoolSubjects(targetEditSchool) || [];
      } catch (err) {
        console.error("Error getting edit subjects:", err);
        return [];
      }
    }
    return [];
  }, [getSchoolSubjects, targetEditSchool]);

  const availableEditSubjects = useMemo(() => {
    const fromDb = (Array.isArray(rawEditSubjects) ? rawEditSubjects : [])
      .map((s) => (typeof s === "string" ? s : s?.name))
      .filter((s): s is string => Boolean(s) && typeof s === "string");
    const customSubs = Array.isArray(editForm.subjects) ? editForm.subjects : [];
    return Array.from(new Set([...fromDb, ...customSubs]));
  }, [rawEditSubjects, editForm.subjects]);

  const availableEditClasses = useMemo(() => {
    if (!targetEditSchool) return scopedClasses;
    return scopedClasses.filter((c) => c && c.schoolId === targetEditSchool);
  }, [targetEditSchool, scopedClasses]);

  const togglePasswordVisibility = (userId: string) => {
    if (!userId) return;
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (isEdit) {
        setEditForm((prev) => ({ ...prev, photo: reader.result as string }));
      } else {
        setCreateForm((prev) => ({ ...prev, photo: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setCreateForm({
      id: generateTeacherId(),
      name: "",
      email: "",
      phone: "",
      role: "teacher" as Role,
      schoolId: currentUser?.schoolId ?? safeSchools?.[0]?.id ?? "",
      classId: "",
      password: generatePassword(),
      subjects: [],
      photo: "",
    });
    setCustomSubjectInput("");
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      resetForm();
    }
    setOpen(isOpen);
  };

  const handleOpenEdit = (user: User) => {
    if (!user) return;
    setEditingUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "teacher",
      schoolId: user.schoolId || currentUser?.schoolId || "",
      classId: user.classId || "",
      password: "",
      subjects: Array.isArray(user.subjects) ? [...user.subjects] : [],
      photo: user.photo || "",
    });
    setEditOpen(true);
  };

  const handleAddCustomSubject = (isEdit = false) => {
    const trimmed = customSubjectInput.trim();
    if (!trimmed) return;
    if (isEdit) {
      const currentSubs = Array.isArray(editForm.subjects) ? editForm.subjects : [];
      if (!currentSubs.includes(trimmed)) {
        setEditForm((prev) => ({ ...prev, subjects: [...currentSubs, trimmed] }));
      }
    } else {
      const currentSubs = Array.isArray(createForm.subjects) ? createForm.subjects : [];
      if (!currentSubs.includes(trimmed)) {
        setCreateForm((prev) => ({ ...prev, subjects: [...currentSubs, trimmed] }));
      }
    }
    setCustomSubjectInput("");
  };

  const listToDisplay = useMemo(() => {
    let list = safeUsers;

    // Filter by school scope
    if (isSuperAdmin && schoolFilter !== "all") {
      list = list.filter((u) => u?.schoolId === schoolFilter);
    } else if (!isSuperAdmin && currentUser?.schoolId) {
      list = list.filter(
        (u) => !u?.schoolId || u?.schoolId === currentUser.schoolId || u?.role === "teacher",
      );
    }

    // Filter by role if set
    if (roleFilter !== "all") {
      list = list.filter((u) => u?.role === roleFilter);
    }

    // Filter by class
    if (classFilter !== "all") {
      list = list.filter((u) => u?.classId === classFilter);
    }

    // Filter by search query
    if (q.trim()) {
      const searchLower = q.toLowerCase();
      list = list.filter((u) => {
        if (!u) return false;
        const nameMatch = (u.name || "").toLowerCase().includes(searchLower);
        const emailMatch = (u.email || "").toLowerCase().includes(searchLower);
        const idMatch = (u.id || "").toLowerCase().includes(searchLower);
        const phoneMatch = (u.phone || "").toLowerCase().includes(searchLower);
        const subs = Array.isArray(u.subjects) ? u.subjects : [];
        const subjectMatch = subs.some(
          (s) => typeof s === "string" && s.toLowerCase().includes(searchLower),
        );
        const className = safeClasses.find((c) => c?.id === u.classId)?.name || "";
        const classMatch = className.toLowerCase().includes(searchLower);
        return nameMatch || emailMatch || idMatch || phoneMatch || subjectMatch || classMatch;
      });
    }

    return list;
  }, [
    safeUsers,
    roleFilter,
    isSuperAdmin,
    schoolFilter,
    currentUser?.schoolId,
    classFilter,
    q,
    safeClasses,
  ]);

  const activeTeachers = useMemo(
    () =>
      (listToDisplay || []).filter(
        (t) => t && (t.status === "verified" || !t.status || (t.status as string) === "active"),
      ),
    [listToDisplay],
  );
  const pendingTeachers = useMemo(
    () => (listToDisplay || []).filter((t) => t && t.status === "pending"),
    [listToDisplay],
  );
  const rejectedTeachers = useMemo(
    () => (listToDisplay || []).filter((t) => t && t.status === "rejected"),
    [listToDisplay],
  );

  const formatRegisteredAt = (value: string | Date | undefined | null) => {
    if (!value) return "N/A";
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === "string") return value.slice(0, 10);
    return String(value);
  };

  const submitCreateUser = async () => {
    const userId = createForm.id.trim();
    const name = createForm.name.trim();
    const email = createForm.email.trim();
    const phone = createForm.phone.trim();
    const password = createForm.password.trim();

    if (!userId || !name || !email || !phone || !password) {
      return toast.error("Please fill in all required fields (ID, Name, Email, Phone, Password)");
    }

    if (safeUsers.some((u) => (u?.id || "").trim().toLowerCase() === userId.toLowerCase())) {
      return toast.error(`User ID '${userId}' is already assigned. Please choose another.`);
    }
    if (safeUsers.some((u) => (u?.email || "").trim().toLowerCase() === email.toLowerCase())) {
      return toast.error(`Email address '${email}' is already registered.`);
    }
    if (safeUsers.some((u) => u?.phone && u.phone.trim() === phone)) {
      return toast.error(`Phone number '${phone}' is already registered.`);
    }

    const targetSchoolId = isSuperAdmin ? createForm.schoolId : (currentUser?.schoolId ?? "");
    if (!isSuperAdmin && !targetSchoolId) {
      return toast.error("School context is missing");
    }

    try {
      await registerUser({
        id: userId,
        name: name,
        email: email,
        phone: phone,
        role: createForm.role,
        password: password,
        schoolId: isSuperAdmin && createForm.role === "super_admin" ? undefined : targetSchoolId,
        classId: createForm.classId || undefined,
        status: "verified",
        subjects: createForm.role === "teacher" ? createForm.subjects : undefined,
        photo: createForm.photo,
      });

      toast.success(`Teacher account for ${name} (${userId}) created successfully!`);
      setOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Failed to create teacher account");
    }
  };

  const submitEditUser = async () => {
    if (!editingUser) return;
    const name = editForm.name.trim();
    const email = editForm.email.trim();
    const phone = editForm.phone.trim();

    if (!name || !email || !phone) {
      return toast.error("Please fill in all required fields (Name, Email, Phone)");
    }

    if (
      safeUsers.some(
        (u) =>
          u?.id !== editingUser.id && (u?.email || "").trim().toLowerCase() === email.toLowerCase(),
      )
    ) {
      return toast.error(`Email address '${email}' is registered to another user`);
    }
    if (safeUsers.some((u) => u?.id !== editingUser.id && u?.phone && u.phone.trim() === phone)) {
      return toast.error(`Phone number '${phone}' is registered to another user`);
    }

    try {
      const updates: Partial<Omit<User, "id" | "registeredAt">> & { password?: string } = {
        name,
        email,
        phone,
        role: editForm.role,
        schoolId: editForm.schoolId || undefined,
        classId: editForm.classId || undefined,
        subjects: editForm.role === "teacher" ? editForm.subjects : undefined,
        photo: editForm.photo || undefined,
      };

      if (editForm.password.trim()) {
        updates.password = editForm.password.trim();
      }

      await updateUser(editingUser.id, updates);
      toast.success(`Updated profile for ${name}`);
      setEditOpen(false);
      setEditingUser(null);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(error.message || "Failed to update teacher");
    }
  };

  // Helper for safe initials calculation
  const getInitials = (name?: string) => {
    const str = String(name || "T").trim();
    const parts = str.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "T";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Render Grid/Card View for Available Teachers
  const renderCards = (list: typeof users, withActions = false, showManage = false) => {
    if (!list || list.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-2xl bg-card">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No Teachers Found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            There are no teacher records matching your current filter criteria.
          </p>
          {(canManage || canApprove) && (
            <Button onClick={() => setOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Add Teacher
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((t) => {
          if (!t) return null;
          const schoolName = safeSchools.find((s) => s?.id === t.schoolId)?.name || "System Wide";
          const assignedClass = safeClasses.find((c) => c?.id === t.classId)?.name;
          const canDelete = isSuperAdmin && t.id !== currentUser?.id;
          const initials = getInitials(t.name);
          const tSubjects = Array.isArray(t.subjects)
            ? t.subjects.filter((s): s is string => typeof s === "string")
            : [];

          return (
            <Card
              key={t.id || Math.random().toString()}
              className="border shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-sm">
                      {t.photo && <AvatarImage src={t.photo} alt={t.name || "Teacher"} />}
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-bold text-base flex items-center gap-2">
                        {t.name || "Unnamed"}
                        {t.id === currentUser?.id && (
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 px-1 text-primary border-primary/40"
                          >
                            You
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 font-mono">
                        <span>{t.id || "N/A"}</span>
                        {t.id && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              navigator.clipboard.writeText(t.id);
                              toast.success("User ID copied");
                            }}
                            title="Copy ID"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={
                      t.status === "verified" || !t.status
                        ? "default"
                        : t.status === "rejected"
                          ? "destructive"
                          : "secondary"
                    }
                    className="capitalize text-xs font-normal shrink-0"
                  >
                    {t.status || "Active"}
                  </Badge>
                </div>

                {/* Info Pills */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{t.email || "No email"}</span>
                  </div>

                  {t.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{t.phone}</span>
                    </div>
                  )}

                  {isSuperAdmin && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <School className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{schoolName}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-muted-foreground shrink-0 font-medium">Class:</span>
                    {assignedClass ? (
                      <Badge
                        variant="secondary"
                        className="font-normal text-xs py-0.5 bg-primary/10 text-primary"
                      >
                        <Building2 className="h-3 w-3 mr-1" />
                        {assignedClass}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground italic">Unassigned</span>
                    )}
                  </div>

                  {/* Teaching Subjects */}
                  <div className="pt-2">
                    <span className="text-muted-foreground font-medium block mb-1.5">
                      Subjects:
                    </span>
                    {tSubjects.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {tSubjects.map((sub) => (
                          <Badge
                            key={sub}
                            variant="outline"
                            className="text-[11px] py-0 px-2 font-normal bg-secondary/40 text-secondary-foreground"
                          >
                            {sub}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">No subjects assigned</span>
                    )}
                  </div>

                  {/* Credentials / Password for Admins */}
                  {(isSuperAdmin || isSchoolAdmin) && t.id && (
                    <div className="mt-3 pt-3 border-t flex items-center justify-between bg-muted/40 p-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-mono text-xs">
                          {visiblePasswords[t.id] ? t.password || "No password" : "••••••••"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => togglePasswordVisibility(t.id)}
                          title={visiblePasswords[t.id] ? "Hide password" : "Show password"}
                        >
                          {visiblePasswords[t.id] ? (
                            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </Button>
                        {t.password && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => {
                              navigator.clipboard.writeText(t.password || "");
                              toast.success("Password copied to clipboard");
                            }}
                            title="Copy Password"
                          >
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>

              {/* Actions Footer */}
              {(withActions || showManage) && t.id && (
                <div className="p-3 bg-muted/30 border-t flex items-center justify-end gap-2">
                  {withActions && (
                    <>
                      <Button
                        size="sm"
                        className="h-8 gap-1"
                        onClick={async () => {
                          await approveTeacher(t.id);
                          toast.success(`${t.name || "Teacher"} approved - account active`);
                        }}
                      >
                        <Check className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 gap-1"
                        onClick={async () => {
                          await rejectTeacher(t.id);
                          toast(`${t.name || "Teacher"} status set to rejected`);
                        }}
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </>
                  )}
                  {showManage && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => handleOpenEdit(t)}
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Edit Profile
                      </Button>
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={async () => {
                            if (
                              confirm(
                                `Are you sure you want to delete ${t.name || "this user"}? This action cannot be undone.`,
                              )
                            ) {
                              try {
                                await deleteUser(t.id);
                                toast.success(`${t.name || "User"} has been deleted`);
                              } catch (error: any) {
                                toast.error(error.message || "Failed to delete user");
                              }
                            }
                          }}
                          title="Delete User"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    );
  };

  // Render Table View
  const renderTable = (list: typeof users, withActions = false, showManage = false) => {
    let totalCols = 5; // Teacher, Subjects, Class, Registered, Status
    if (isSuperAdmin) totalCols += 2; // User ID, School
    if (isSuperAdmin || isSchoolAdmin) totalCols += 1; // Password
    if (withActions || showManage) totalCols += 1; // Actions

    return (
      <div className="rounded-xl border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {isSuperAdmin && <TableHead>User ID</TableHead>}
              <TableHead>Teacher Details</TableHead>
              {isSuperAdmin && <TableHead>School</TableHead>}
              <TableHead>Assigned Class</TableHead>
              <TableHead>Subjects</TableHead>
              {(isSuperAdmin || isSchoolAdmin) && <TableHead>Password</TableHead>}
              <TableHead>Registered</TableHead>
              <TableHead>Status</TableHead>
              {(withActions || showManage) && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(list || []).map((t) => {
              if (!t) return null;
              const schoolName =
                safeSchools.find((s) => s?.id === t.schoolId)?.name || "System Wide";
              const assignedClass =
                safeClasses.find((c) => c?.id === t.classId)?.name || "Unassigned";
              const canDelete = isSuperAdmin && t.id !== currentUser?.id;
              const initials = getInitials(t.name);
              const tSubjects = Array.isArray(t.subjects)
                ? t.subjects.filter((s): s is string => typeof s === "string")
                : [];

              return (
                <TableRow
                  key={t.id || Math.random().toString()}
                  className="group hover:bg-muted/40"
                >
                  {isSuperAdmin && (
                    <TableCell className="font-mono text-xs font-semibold">
                      <div className="flex items-center gap-1">
                        <span>{t.id || "N/A"}</span>
                        {t.id && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              navigator.clipboard.writeText(t.id);
                              toast.success("User ID copied");
                            }}
                            title="Copy ID"
                          >
                            <Copy className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border">
                        {t.photo && <AvatarImage src={t.photo} alt={t.name || "Teacher"} />}
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-sm flex items-center gap-2">
                          {t.name || "Unnamed"}
                          {t.id === currentUser?.id && (
                            <Badge
                              variant="outline"
                              className="text-[10px] py-0 px-1 border-primary/40 text-primary font-normal"
                            >
                              You
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5 mt-0.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {t.email || "No email"}
                          </span>
                          {t.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {t.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  {isSuperAdmin && (
                    <TableCell className="text-muted-foreground text-xs">{schoolName}</TableCell>
                  )}
                  <TableCell>
                    <Badge
                      variant={t.classId ? "secondary" : "outline"}
                      className="font-normal text-xs"
                    >
                      <Building2 className="h-3 w-3 mr-1 opacity-70" />
                      {assignedClass}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    {tSubjects.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {tSubjects.map((sub) => (
                          <Badge
                            key={sub}
                            variant="outline"
                            className="text-[11px] py-0 px-1.5 font-normal bg-secondary/50"
                          >
                            {sub}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">None assigned</span>
                    )}
                  </TableCell>
                  {(isSuperAdmin || isSchoolAdmin) && (
                    <TableCell className="font-mono text-xs">
                      {t.id ? (
                        <div className="flex items-center gap-1">
                          <span>{visiblePasswords[t.id] ? t.password || "N/A" : "••••••••"}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => togglePasswordVisibility(t.id)}
                            title={visiblePasswords[t.id] ? "Hide password" : "Show password"}
                          >
                            {visiblePasswords[t.id] ? (
                              <EyeOff className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <Eye className="h-3 w-3 text-muted-foreground" />
                            )}
                          </Button>
                          {t.password && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                navigator.clipboard.writeText(t.password || "");
                                toast.success("Password copied");
                              }}
                              title="Copy password"
                            >
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-xs text-muted-foreground">
                    {formatRegisteredAt(t.registeredAt)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        t.status === "verified" || !t.status
                          ? "default"
                          : t.status === "rejected"
                            ? "destructive"
                            : "secondary"
                      }
                      className="capitalize text-xs font-normal"
                    >
                      {t.status || "Active"}
                    </Badge>
                  </TableCell>
                  {(withActions || showManage) && (
                    <TableCell className="text-right space-x-1">
                      {withActions && t.id && (
                        <>
                          <Button
                            size="sm"
                            onClick={async () => {
                              await approveTeacher(t.id);
                              toast.success(`${t.name || "Teacher"} approved - account active`);
                            }}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={async () => {
                              await rejectTeacher(t.id);
                              toast(`${t.name || "Teacher"} status set to rejected`);
                            }}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {showManage && t.id && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEdit(t)}
                            title="Edit Teacher"
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              onClick={async () => {
                                if (
                                  confirm(
                                    `Are you sure you want to delete ${t.name || "this user"}? This action cannot be undone.`,
                                  )
                                ) {
                                  try {
                                    await deleteUser(t.id);
                                    toast.success(`${t.name || "User"} has been deleted`);
                                  } catch (error: any) {
                                    toast.error(error.message || "Failed to delete user");
                                  }
                                }
                              }}
                              title="Delete User"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {(!list || list.length === 0) && (
              <TableRow>
                <TableCell colSpan={totalCols} className="text-center text-muted-foreground py-10">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <GraduationCap className="h-8 w-8 text-muted-foreground/50" />
                    <span>No teacher accounts found matching your filter criteria.</span>
                    {(canManage || canApprove) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setOpen(true)}
                        className="mt-2"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Teacher
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Teacher Metrics (scoped to current school for School Admins, or selected school for Super Admin)
  const schoolScopedUsers = useMemo(() => {
    if (isSuperAdmin && schoolFilter !== "all") {
      return safeUsers.filter((u) => u?.schoolId === schoolFilter);
    }
    if (!isSuperAdmin && currentUser?.schoolId) {
      return safeUsers.filter(
        (u) => !u?.schoolId || u?.schoolId === currentUser.schoolId || u?.role === "teacher",
      );
    }
    return safeUsers;
  }, [safeUsers, isSuperAdmin, schoolFilter, currentUser?.schoolId]);

  const totalTeachers = schoolScopedUsers.filter((u) => u?.role === "teacher").length;
  const pendingTeachersCount = schoolScopedUsers.filter(
    (u) => u?.role === "teacher" && u?.status === "pending",
  ).length;
  const verifiedTeachersCount = schoolScopedUsers.filter(
    (u) =>
      u?.role === "teacher" &&
      (u?.status === "verified" || !u?.status || (u?.status as string) === "active"),
  ).length;

  if (loading && safeUsers.length === 0) {
    return (
      <AppShell title="Teachers & Staff">
        <div className="min-h-[50vh] flex flex-col items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
          <p className="text-sm text-muted-foreground animate-pulse">
            Loading teachers directory...
          </p>
        </div>
      </AppShell>
    );
  }

  if (!isAuthorized) {
    return (
      <AppShell title="Unauthorized">
        <Card className="border-destructive/50 max-w-lg mx-auto mt-8">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>You do not have permission to view the Teachers page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <strong>Current user:</strong> {currentUser?.name || "Unknown"}
            </div>
            <div className="text-sm">
              <strong>Current role:</strong>{" "}
              <Badge variant="outline" className="capitalize">
                {currentUser?.role?.replace("_", " ") || "none"}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              <strong>Required roles:</strong> Admin, Super Admin, Deputy, or Teacher
            </div>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="Teachers & Staff">
      <div className="space-y-6">
        {loadError && (
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
              <span>{loadError}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => attemptLoad()}
              className="shrink-0 gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center dark:text-emerald-400">
                <UserCheck className="h-6 w-6" />
              </div>
              <div>
                <div className="text-3xl font-bold">{verifiedTeachersCount}</div>
                <div className="text-sm text-muted-foreground font-medium">
                  Available Active Teachers
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center dark:text-amber-400">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <div className="text-3xl font-bold">{pendingTeachersCount}</div>
                <div className="text-sm text-muted-foreground font-medium">Pending Approvals</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-500/15 text-blue-600 flex items-center justify-center dark:text-blue-400">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <div className="text-3xl font-bold">{totalTeachers}</div>
                <div className="text-sm text-muted-foreground font-medium">
                  Total Registered Staff
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Card */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Teachers Directory
              </CardTitle>
              <CardDescription>
                View all available teachers, assign classes and subjects, manage login credentials,
                and add new teaching staff.
              </CardDescription>
            </div>

            {/* Create Teacher Dialog */}
            {(canManage || canApprove) && (
              <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-1.5 shadow-sm font-medium">
                    <UserPlus className="h-4 w-4" /> Add New Teacher
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-primary" /> Register New Teacher Account
                    </DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitCreateUser();
                    }}
                    autoComplete="off"
                    className="space-y-4 py-2 text-sm"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label htmlFor="create-id">Teacher ID *</Label>
                          <button
                            type="button"
                            onClick={() =>
                              setCreateForm((prev) => ({ ...prev, id: generateTeacherId() }))
                            }
                            className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
                          >
                            <RefreshCw className="h-3 w-3" /> Auto
                          </button>
                        </div>
                        <Input
                          id="create-id"
                          value={createForm.id}
                          onChange={(e) => setCreateForm({ ...createForm, id: e.target.value })}
                          placeholder="e.g. TCH-1024"
                          autoComplete="off"
                          required
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label htmlFor="create-pwd">Password *</Label>
                          <button
                            type="button"
                            onClick={() =>
                              setCreateForm((prev) => ({ ...prev, password: generatePassword() }))
                            }
                            className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
                          >
                            <Sparkles className="h-3 w-3" /> Generate
                          </button>
                        </div>
                        <div className="relative">
                          <Input
                            id="create-pwd"
                            type={showCreatePassword ? "text" : "password"}
                            value={createForm.password}
                            onChange={(e) =>
                              setCreateForm({ ...createForm, password: e.target.value })
                            }
                            placeholder="Password"
                            autoComplete="new-password"
                            className="pr-9"
                            required
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="absolute right-0 top-0 h-9 w-9 text-muted-foreground"
                            onClick={() => setShowCreatePassword(!showCreatePassword)}
                          >
                            {showCreatePassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="create-name">Full Name *</Label>
                      <Input
                        id="create-name"
                        value={createForm.name}
                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                        placeholder="e.g. Sarah Johnson"
                        autoComplete="off"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="create-email">Email Address *</Label>
                        <Input
                          id="create-email"
                          type="email"
                          value={createForm.email}
                          onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                          placeholder="sarah@school.com"
                          autoComplete="off"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="create-phone">Phone Number *</Label>
                        <Input
                          id="create-phone"
                          value={createForm.phone}
                          onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                          placeholder="+256 700 000000"
                          autoComplete="off"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="create-role">System Role</Label>
                        <select
                          id="create-role"
                          value={createForm.role}
                          onChange={(e) =>
                            setCreateForm({ ...createForm, role: e.target.value as Role })
                          }
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="teacher">Teacher</option>
                          <option value="deputy">Deputy Head</option>
                          {isSuperAdmin && <option value="admin">School Admin</option>}
                        </select>
                      </div>
                      {isSuperAdmin && (
                        <div>
                          <Label htmlFor="create-school">Assigned School</Label>
                          <select
                            id="create-school"
                            value={createForm.schoolId}
                            onChange={(e) =>
                              setCreateForm({ ...createForm, schoolId: e.target.value })
                            }
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            {safeSchools.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="create-class">Assigned Class (Optional)</Label>
                      <select
                        id="create-class"
                        value={createForm.classId}
                        onChange={(e) => setCreateForm({ ...createForm, classId: e.target.value })}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">-- No Class Assigned --</option>
                        {availableClasses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {createForm.role === "teacher" && (
                      <div className="space-y-2">
                        <Label>Teaching Subjects</Label>
                        <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg max-h-36 overflow-y-auto bg-muted/20">
                          {availableSubjects.map((subject) => (
                            <label
                              key={subject}
                              className="flex items-center gap-2 cursor-pointer text-xs p-1 rounded hover:bg-muted/50 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={(createForm.subjects || []).includes(subject)}
                                onChange={(e) => {
                                  const currentSubs = Array.isArray(createForm.subjects)
                                    ? createForm.subjects
                                    : [];
                                  if (e.target.checked) {
                                    setCreateForm({
                                      ...createForm,
                                      subjects: [...currentSubs, subject],
                                    });
                                  } else {
                                    setCreateForm({
                                      ...createForm,
                                      subjects: currentSubs.filter((s) => s !== subject),
                                    });
                                  }
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <span className="truncate">{subject}</span>
                            </label>
                          ))}
                        </div>

                        {/* Add Custom Subject Inline */}
                        <div className="flex gap-2 pt-1">
                          <Input
                            placeholder="Add custom subject (e.g. Music, Art)"
                            value={customSubjectInput}
                            onChange={(e) => setCustomSubjectInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddCustomSubject(false);
                              }
                            }}
                            className="h-8 text-xs"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs shrink-0"
                            onClick={() => handleAddCustomSubject(false)}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Add
                          </Button>
                        </div>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="create-photo">Profile Photo (Optional)</Label>
                      <Input
                        id="create-photo"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoChange(e, false)}
                        className="mt-1"
                      />
                      {createForm.photo && (
                        <div className="mt-2 flex items-center gap-3 p-2 border rounded-lg bg-muted/20">
                          <img
                            src={createForm.photo}
                            alt="Preview"
                            className="w-10 h-10 object-cover rounded-full border"
                          />
                          <span className="text-xs text-muted-foreground">
                            Photo preview loaded
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs text-destructive h-7 ml-auto"
                            onClick={() => setCreateForm((prev) => ({ ...prev, photo: "" }))}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>

                    <DialogFooter className="pt-3">
                      <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" className="gap-1.5">
                        <UserPlus className="h-4 w-4" /> Create Teacher Account
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}

            {/* Edit Teacher Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Edit2 className="h-5 w-5 text-primary" /> Edit Teacher Profile (
                    {editingUser?.id})
                  </DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitEditUser();
                  }}
                  autoComplete="off"
                  className="space-y-4 py-2 text-sm"
                >
                  <div>
                    <Label htmlFor="edit-name">Full Name *</Label>
                    <Input
                      id="edit-name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      autoComplete="off"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="edit-email">Email Address *</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        autoComplete="off"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-phone">Phone Number *</Label>
                      <Input
                        id="edit-phone"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        autoComplete="off"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="edit-role">System Role</Label>
                      <select
                        id="edit-role"
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="teacher">Teacher</option>
                        <option value="deputy">Deputy Head</option>
                        {isSuperAdmin && <option value="admin">School Admin</option>}
                      </select>
                    </div>
                    {isSuperAdmin && (
                      <div>
                        <Label htmlFor="edit-school">Assigned School</Label>
                        <select
                          id="edit-school"
                          value={editForm.schoolId}
                          onChange={(e) => setEditForm({ ...editForm, schoolId: e.target.value })}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          {safeSchools.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="edit-class">Assigned Class</Label>
                    <select
                      id="edit-class"
                      value={editForm.classId}
                      onChange={(e) => setEditForm({ ...editForm, classId: e.target.value })}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">-- No Class Assigned --</option>
                      {availableEditClasses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="edit-pwd">Reset Password (Leave blank to keep existing)</Label>
                    <Input
                      id="edit-pwd"
                      type="password"
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      placeholder="Enter new password if updating"
                      autoComplete="new-password"
                    />
                  </div>
                  {editForm.role === "teacher" && (
                    <div className="space-y-2">
                      <Label>Teaching Subjects</Label>
                      <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg max-h-36 overflow-y-auto bg-muted/20">
                        {availableEditSubjects.map((subject) => (
                          <label
                            key={subject}
                            className="flex items-center gap-2 cursor-pointer text-xs p-1 rounded hover:bg-muted/50 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={(editForm.subjects || []).includes(subject)}
                              onChange={(e) => {
                                const currentSubs = Array.isArray(editForm.subjects)
                                  ? editForm.subjects
                                  : [];
                                if (e.target.checked) {
                                  setEditForm({ ...editForm, subjects: [...currentSubs, subject] });
                                } else {
                                  setEditForm({
                                    ...editForm,
                                    subjects: currentSubs.filter((s) => s !== subject),
                                  });
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="truncate">{subject}</span>
                          </label>
                        ))}
                      </div>
                      {/* Add Custom Subject Inline */}
                      <div className="flex gap-2 pt-1">
                        <Input
                          placeholder="Add custom subject..."
                          value={customSubjectInput}
                          onChange={(e) => setCustomSubjectInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddCustomSubject(true);
                            }
                          }}
                          className="h-8 text-xs"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs shrink-0"
                          onClick={() => handleAddCustomSubject(true)}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add
                        </Button>
                      </div>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="edit-photo">Update Profile Photo</Label>
                    <Input
                      id="edit-photo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoChange(e, true)}
                      className="mt-1"
                    />
                    {editForm.photo && (
                      <div className="mt-2 flex items-center gap-3 p-2 border rounded-lg bg-muted/20">
                        <img
                          src={editForm.photo}
                          alt="Preview"
                          className="w-10 h-10 object-cover rounded-full border"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs text-destructive h-7"
                          onClick={() => setEditForm({ ...editForm, photo: "" })}
                        >
                          Remove photo
                        </Button>
                      </div>
                    )}
                  </div>
                  <DialogFooter className="pt-3">
                    <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Save Changes</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>

          <CardContent className="p-5 pt-0 space-y-4">
            {/* Toolbar Filters & Controls */}
            <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by teacher name, subject, class, phone, ID..."
                  className="pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Class Filter */}
                <div className="flex items-center gap-1.5">
                  <Label className="shrink-0 text-xs font-medium text-muted-foreground">
                    Class:
                  </Label>
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="flex h-9 rounded-md border border-input bg-transparent px-2.5 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="all">All Classes</option>
                    {scopedClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Role Filter */}
                <div className="flex items-center gap-1.5">
                  <Label className="shrink-0 text-xs font-medium text-muted-foreground">
                    Role:
                  </Label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="flex h-9 rounded-md border border-input bg-transparent px-2.5 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="teacher">Teachers</option>
                    <option value="deputy">Deputies</option>
                    <option value="admin">School Admins</option>
                    <option value="all">All Roles</option>
                  </select>
                </div>

                {isSuperAdmin && (
                  <div className="flex items-center gap-1.5">
                    <Label className="shrink-0 text-xs font-medium text-muted-foreground">
                      School:
                    </Label>
                    <select
                      value={schoolFilter}
                      onChange={(e) => setSchoolFilter(e.target.value)}
                      className="flex h-9 rounded-md border border-input bg-transparent px-2.5 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="all">All Schools</option>
                      {safeSchools.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* View Mode Toggle */}
                <div className="flex items-center border rounded-lg p-0.5 bg-muted/40 ml-auto">
                  <Button
                    size="icon"
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    className="h-7 w-7 rounded-md"
                    onClick={() => setViewMode("grid")}
                    title="Grid View"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant={viewMode === "table" ? "secondary" : "ghost"}
                    className="h-7 w-7 rounded-md"
                    onClick={() => setViewMode("table")}
                    title="Table View"
                  >
                    <List className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Tabs for Active Teachers, Pending Approvals, All Staff, Rejected */}
            <Tabs defaultValue="active" className="space-y-4">
              <TabsList className="bg-muted/60 p-1">
                <TabsTrigger value="active" className="gap-2">
                  <UserCheck className="h-4 w-4" />
                  Available Teachers
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
                    {activeTeachers.length}
                  </Badge>
                </TabsTrigger>

                <TabsTrigger value="pending" className="gap-2 relative">
                  <Clock className="h-4 w-4" />
                  Pending Approvals
                  {pendingTeachers.length > 0 && (
                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-normal px-1.5 py-0 text-[10px]">
                      {pendingTeachers.length}
                    </Badge>
                  )}
                </TabsTrigger>

                <TabsTrigger value="all" className="gap-2">
                  <GraduationCap className="h-4 w-4" />
                  All Staff ({listToDisplay.length})
                </TabsTrigger>

                {rejectedTeachers.length > 0 && (
                  <TabsTrigger value="rejected" className="gap-2">
                    Rejected ({rejectedTeachers.length})
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Available Active Teachers */}
              <TabsContent value="active" className="mt-0">
                {viewMode === "grid"
                  ? renderCards(activeTeachers, false, canManage)
                  : renderTable(activeTeachers, false, canManage)}
              </TabsContent>

              {/* Pending Approvals */}
              <TabsContent value="pending" className="mt-0">
                {viewMode === "grid"
                  ? renderCards(pendingTeachers, canApprove, false)
                  : renderTable(pendingTeachers, canApprove, false)}
              </TabsContent>

              {/* All Staff */}
              <TabsContent value="all" className="mt-0">
                {viewMode === "grid"
                  ? renderCards(listToDisplay, false, canManage)
                  : renderTable(listToDisplay, false, canManage)}
              </TabsContent>

              {/* Rejected */}
              {rejectedTeachers.length > 0 && (
                <TabsContent value="rejected" className="mt-0">
                  {viewMode === "grid"
                    ? renderCards(rejectedTeachers, false, canManage)
                    : renderTable(rejectedTeachers, false, canManage)}
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
