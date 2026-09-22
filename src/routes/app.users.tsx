import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useStore, type User, type Role } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Eye,
  EyeOff,
  Copy,
  Search,
  Shield,
  School,
  UserCheck,
  Key,
  Plus,
  Trash2,
  Mail,
  Phone,
  Info,
  Download,
  RefreshCw,
  Lock,
  Unlock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  MoreHorizontal,
  Edit,
  UserPlus,
} from "lucide-react";
import { useState, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

export const Route = createFileRoute("/app/users")({
  head: () => ({ meta: [{ title: "User Directory - System Admin" }] }),
  component: UsersPage,
});

function UsersPage() {
  const {
    currentUser,
    users = [],
    schools = [],
    registerUser,
    deleteUser,
    updateUser,
    loading = false,
  } = useStore();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Local filters
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const isSuperAdmin = currentUser?.role === "super_admin";

  // Enhanced analytics
  const userAnalytics = useMemo(() => {
    const allUsers = users || [];
    const activeUsers = allUsers.filter(u => u.status === "verified");
    const pendingUsers = allUsers.filter(u => u.status === "pending");
    const recentUsers = allUsers.filter(u => {
      const registeredDate = parseISO(u.registeredAt);
      const daysSince = differenceInDays(new Date(), registeredDate);
      return daysSince <= 30;
    });

    // Role counts
    const superAdminCount = allUsers.filter(u => u.role === "super_admin").length;
    const adminCount = allUsers.filter(u => u.role === "admin").length;
    const deputyCount = allUsers.filter(u => u.role === "deputy").length;
    const teacherCount = allUsers.filter(u => u.role === "teacher").length;

    // Schools with no admin
    const schoolsWithoutAdmin = schools.filter(school => 
      !allUsers.some(user => user.schoolId === school.id && (user.role === "admin" || user.role === "deputy"))
    );

    return {
      total: allUsers.length,
      active: activeUsers.length,
      pending: pendingUsers.length,
      recent: recentUsers.length,
      superAdminCount,
      adminCount,
      deputyCount,
      teacherCount,
      schoolsWithoutAdmin
    };
  }, [users, schools]);

  // Export functionality
  const exportUsersData = () => {
    const exportData = filteredUsersList.map(user => {
      const school = schools.find(s => s.id === user.schoolId);
      return [
        user.id,
        user.name,
        user.email,
        user.phone || '',
        user.role,
        user.status,
        school?.name || (user.role === 'super_admin' ? 'System Wide' : 'Unassigned'),
        user.registeredAt,
      ];
    });

    const csvContent = [
      ["User ID", "Full Name", "Email", "Phone", "Role", "Status", "School", "Registered Date"],
      ...exportData
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `users_report_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Users data exported successfully");
  };

  // Create User Form State
  const [form, setForm] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    role: "teacher" as Role,
    schoolId: schools?.[0]?.id ?? "",
    password: "",
  });

  // Edit User Form State
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "teacher" as Role,
    schoolId: "",
    password: "", // Optional password update
  });

  const resetForm = () => {
    setForm({
      id: "",
      name: "",
      email: "",
      phone: "",
      role: "teacher" as Role,
      schoolId: schools?.[0]?.id ?? "",
      password: "",
    });
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    resetForm();
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      schoolId: user.schoolId || schools?.[0]?.id || "",
      password: "",
    });
    setEditOpen(true);
  };

  const resetPassword = async (userId: string, userName: string) => {
    const newPassword = `temp${Math.random().toString(36).slice(2, 8)}`;
    try {
      await updateUser(userId, { password: newPassword });
      toast.success(`Password reset for ${userName}. New password: ${newPassword}`);
    } catch (error: any) {
      toast.error("Failed to reset password");
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const filteredUsersList = useMemo(() => {
    let list = users || [];

    // Filter by search query
    if (q.trim()) {
      const search = q.toLowerCase();
      list = list.filter(
        (u) =>
          (u?.name || "").toLowerCase().includes(search) ||
          (u?.email || "").toLowerCase().includes(search) ||
          (u?.id || "").toLowerCase().includes(search) ||
          (u?.phone ? u.phone.toLowerCase().includes(search) : false),
      );
    }

    // Filter by role
    if (roleFilter !== "all") {
      list = list.filter((u) => u?.role === roleFilter);
    }

    // Filter by status
    if (statusFilter !== "all") {
      list = list.filter((u) => u?.status === statusFilter);
    }

    return list;
  }, [users, q, roleFilter, statusFilter]);

  const submitCreateUser = async () => {
    const userId = form.id.trim();
    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const password = form.password.trim();

    if (!userId || !name || !email || !phone || !password) {
      return toast.error("Please fill in all fields");
    }

    // Duplicate user checks
    if (users.some((u) => (u?.id || "").trim().toLowerCase() === userId.toLowerCase())) {
      return toast.error(`User ID '${userId}' is already assigned`);
    }
    if (users.some((u) => (u?.email || "").trim().toLowerCase() === email.toLowerCase())) {
      return toast.error(`Email address '${email}' is already registered`);
    }
    if (users.some((u) => u?.phone && u.phone.trim() === phone)) {
      return toast.error(`Phone number '${phone}' is already registered`);
    }

    const targetSchoolId = form.role === "super_admin" ? undefined : form.schoolId;

    try {
      await registerUser({
        id: form.id.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
        password: form.password,
        schoolId: targetSchoolId,
        status: "verified",
      });

      toast.success(`Account for ${form.name} created successfully!`);
      setOpen(false);
      setForm({
        id: "",
        name: "",
        email: "",
        phone: "",
        role: "teacher",
        schoolId: schools?.[0]?.id ?? "",
        password: "",
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to create user");
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (id === currentUser?.id) {
      return toast.error("You cannot delete your own account.");
    }
    if (confirm(`Are you sure you want to delete user "${name}"? This action cannot be undone.`)) {
      try {
        await deleteUser(id);
        toast.success(`User "${name}" deleted successfully.`);
      } catch (error: any) {
        toast.error(error.message || "Failed to delete user");
      }
    }
  };

  if (loading && !currentUser) {
    return (
      <AppShell title="User Directory">
        <div className="min-h-[50vh] flex flex-col items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading users...</p>
        </div>
      </AppShell>
    );
  }

  if (!isSuperAdmin) {
    return (
      <AppShell title="Unauthorized">
        <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center gap-3">
          <Shield className="h-12 w-12 text-destructive animate-pulse" />
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p>
            You do not have permission to view the User Directory. This page is reserved for Super
            Administrators.
          </p>
        </div>
      </AppShell>
    );
  }

  // Enhanced metrics display using userAnalytics instead of basic counts
  return (
    <AppShell title="User Directory">
      <div className="space-y-6">
        {/* Enhanced Metrics Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-500/10 to-transparent">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/15 text-indigo-600 flex items-center justify-center dark:text-indigo-400">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <div className="text-3xl font-bold">{userAnalytics.superAdminCount}</div>
                <div className="text-sm text-muted-foreground">Super Admins</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500/10 to-transparent">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-500/15 text-blue-600 flex items-center justify-center dark:text-blue-400">
                <School className="h-6 w-6" />
              </div>
              <div>
                <div className="text-3xl font-bold">{userAnalytics.adminCount}</div>
                <div className="text-sm text-muted-foreground">School Admins</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-cyan-500/10 to-transparent">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-cyan-500/15 text-cyan-600 flex items-center justify-center dark:text-cyan-400">
                <UserCheck className="h-6 w-6" />
              </div>
              <div>
                <div className="text-3xl font-bold">{userAnalytics.deputyCount}</div>
                <div className="text-sm text-muted-foreground">Deputies</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-500/10 to-transparent">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center dark:text-emerald-400">
                <Key className="h-6 w-6" />
              </div>
              <div>
                <div className="text-3xl font-bold">{userAnalytics.teacherCount}</div>
                <div className="text-sm text-muted-foreground">Teachers</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500/10 to-transparent">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center dark:text-amber-400">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <div className="text-3xl font-bold">{userAnalytics.pending}</div>
                <div className="text-sm text-muted-foreground">Pending Approval</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts for schools without admin */}
        {userAnalytics.schoolsWithoutAdmin.length > 0 && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-amber-800 dark:text-amber-200">Schools Missing Administrators</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  The following schools don't have assigned administrators: {" "}
                  <strong>{userAnalytics.schoolsWithoutAdmin.map(s => s.name).join(", ")}</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Console */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 gap-4">
            <div>
              <CardTitle>System Accounts</CardTitle>
              <CardDescription>
                View all registered users, their login IDs, passwords, roles, and school
                assignments.
              </CardDescription>
            </div>
            <Dialog open={open} onOpenChange={handleOpenChange}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-1.5">
                  <Plus className="h-4 w-4" /> Create User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New System User</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitCreateUser();
                  }}
                  autoComplete="off"
                  className="space-y-4 py-2"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="id">User ID (Login ID) *</Label>
                      <Input
                        id="id"
                        value={form.id}
                        onChange={(e) => setForm({ ...form, id: e.target.value })}
                        placeholder="e.g. KC004"
                        required
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="e.g. secure123"
                        required
                        autoComplete="new-password"
                        data-lpignore="true"
                        data-bwignore="true"
                        data-1p-ignore="true"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. John Doe"
                      autoComplete="off"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="john@example.com"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="+256..."
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="role">System Role *</Label>
                      <select
                        id="role"
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring file:border-0 file:bg-transparent file:text-sm file:font-medium"
                      >
                        <option value="teacher">Teacher</option>
                        <option value="deputy">Deputy</option>
                        <option value="admin">School Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </div>
                    {form.role !== "super_admin" && (
                      <div>
                        <Label htmlFor="schoolId">Assign School *</Label>
                        <select
                          id="schoolId"
                          value={form.schoolId}
                          onChange={(e) => setForm({ ...form, schoolId: e.target.value })}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring file:border-0 file:bg-transparent file:text-sm file:font-medium"
                        >
                          {schools.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <DialogFooter className="mt-4">
                    <Button type="submit">Create Account</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {/* Search and Filter Section */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6 justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name, email, phone or ID..."
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="shrink-0 text-sm font-medium">Role Filter:</Label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring file:border-0 file:bg-transparent file:text-sm file:font-medium"
                >
                  <option value="all">All Roles</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">School Admin</option>
                  <option value="deputy">Deputy</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>User Details</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>System Role</TableHead>
                    <TableHead>Associated School</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsersList.map((u) => {
                    const associatedSchool = schools.find((s) => s.id === u.schoolId);
                    const schoolName =
                      u.role === "super_admin"
                        ? "System Wide"
                        : associatedSchool?.name || "Unassigned";
                    const isSelf = u.id === currentUser?.id;

                    // Role Badge styling
                    let roleBadgeClass = "";
                    if (u.role === "super_admin") {
                      roleBadgeClass =
                        "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-850";
                    } else if (u.role === "admin") {
                      roleBadgeClass =
                        "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-850";
                    } else if (u.role === "deputy") {
                      roleBadgeClass =
                        "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-850";
                    } else {
                      roleBadgeClass =
                        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-850";
                    }

                    return (
                      <TableRow key={u.id} className="group hover:bg-muted/40">
                        {/* ID Column */}
                        <TableCell className="font-mono text-xs font-semibold">
                          <div className="flex items-center gap-1.5">
                            <span>{u.id}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                navigator.clipboard.writeText(u.id);
                                toast.success("User ID copied");
                              }}
                              title="Copy ID"
                            >
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                        </TableCell>

                        {/* Name & Contact */}
                        <TableCell>
                          <div>
                            <div className="font-semibold text-sm flex items-center gap-2">
                              {u.name}
                              {isSelf && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-normal py-0 px-1 border-primary/45 text-primary"
                                >
                                  You
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-col gap-0.5 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {u.email}
                              </span>
                              {u.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" /> {u.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Password Column */}
                        <TableCell className="font-mono text-sm">
                          <div className="flex items-center gap-1">
                            <span className="tracking-wide">
                              {visiblePasswords[u.id] ? u.password || "N/A" : "••••••••"}
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => togglePasswordVisibility(u.id)}
                              title={visiblePasswords[u.id] ? "Hide password" : "Show password"}
                            >
                              {visiblePasswords[u.id] ? (
                                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                              ) : (
                                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </Button>
                            {u.password && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                  navigator.clipboard.writeText(u.password || "");
                                  toast.success("Password copied");
                                }}
                                title="Copy password"
                              >
                                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            )}
                          </div>
                        </TableCell>

                        {/* Role Column */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`capitalize font-medium ${roleBadgeClass}`}
                          >
                            {(u?.role || "user").replace(/_/g, " ")}
                          </Badge>
                        </TableCell>

                        {/* Associated School Column */}
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <School className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span
                              className={
                                u.role === "super_admin"
                                  ? "text-indigo-600 dark:text-indigo-400 font-medium"
                                  : "text-foreground"
                              }
                            >
                              {schoolName}
                            </span>
                          </div>
                        </TableCell>

                        {/* Actions Column */}
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={isSelf}
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            title={isSelf ? "Cannot delete yourself" : "Delete user"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredUsersList.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No users found matching the filter criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Context Info */}
            <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              <span>
                To switch the active school scope or view users across all schools, use the{" "}
                <strong>School Context</strong> dropdown selector in the side navigation panel.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
