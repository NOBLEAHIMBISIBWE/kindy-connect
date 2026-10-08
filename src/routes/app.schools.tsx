import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useStore, type School } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Search, Edit2, Trash2, Building, Phone, Mail, MapPin } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/schools")({
  head: () => ({ meta: [{ title: "Schools - Noble Edu Admin" }] }),
  component: SchoolsPage,
});

function SchoolsPage() {
  const { currentUser, schools, users, students, addSchool, updateSchool, deleteSchool } =
    useStore();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);

  const isSuperAdmin = currentUser?.role === "super_admin";

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
  });

  const filtered = useMemo(() => {
    return schools.filter(
      (s) =>
        (s && s.name && s.name.toLowerCase().includes(q.toLowerCase())) ||
        (s && s.address && s.address.toLowerCase().includes(q.toLowerCase())),
    );
  }, [schools, q]);

  const formatDate = (value: string | Date) =>
    value instanceof Date ? value.toISOString().slice(0, 10) : value;

  const submitCreate = async () => {
    const schoolName = form.name.trim();
    if (!schoolName) return toast.error("School name is required");

    if (schools.some((s) => s.name.trim().toLowerCase() === schoolName.toLowerCase())) {
      return toast.error(`A school named '${schoolName}' already exists`);
    }

    try {
      await addSchool({
        name: schoolName,
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
      });
      toast.success("School created successfully");
      setOpen(false);
      setForm({ name: "", address: "", phone: "", email: "" });
    } catch (err: any) {
      toast.error(err?.message || "Failed to create school");
    }
  };

  const startEdit = (s: School) => {
    setEditingSchool(s);
    setEditForm({
      name: s.name,
      address: s.address || "",
      phone: s.phone || "",
      email: s.email || "",
    });
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editingSchool) return;
    const schoolName = editForm.name.trim();
    if (!schoolName) return toast.error("School name is required");

    if (
      schoolName.toLowerCase() !== editingSchool.name.trim().toLowerCase() &&
      schools.some((s) => s.name.trim().toLowerCase() === schoolName.toLowerCase())
    ) {
      return toast.error(`A school named '${schoolName}' already exists`);
    }

    try {
      await updateSchool(editingSchool.id, {
        name: schoolName,
        address: editForm.address.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        email: editForm.email.trim() || undefined,
      });

      toast.success("School details updated");
      setEditOpen(false);
      setEditingSchool(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update school");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      confirm(
        `WARNING: Deleting "${name}" will also delete all classes, students, and parents belonging to it. Users will be unassigned. Proceed?`,
      )
    ) {
      await deleteSchool(id);
      toast.success("School and all its associated data deleted");
    }
  };

  if (!isSuperAdmin) {
    return (
      <AppShell title="Unauthorized">
        <div className="text-center py-12 text-muted-foreground">
          You do not have permission to access school administration.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="System Schools">
      <div className="space-y-6">
        {/* Quick Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/10 to-transparent">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
                <Building className="h-6 w-6" />
              </div>
              <div>
                <div className="text-3xl font-bold">{schools.length}</div>
                <div className="text-sm text-muted-foreground">Total Registered Schools</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-accent/10 to-transparent">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-accent/15 text-accent flex items-center justify-center">
                <Phone className="h-6 w-6" />
              </div>
              <div>
                <div className="text-3xl font-bold">
                  {users.filter((u) => u.role === "admin").length}
                </div>
                <div className="text-sm text-muted-foreground">Active School Admins</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-chart-4/10 to-transparent">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-chart-4/15 text-chart-4 flex items-center justify-center">
                <Building className="h-6 w-6" />
              </div>
              <div>
                <div className="text-3xl font-bold">
                  {users.filter((u) => u.role === "teacher").length}
                </div>
                <div className="text-sm text-muted-foreground">Registered Teachers</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Manage Schools</CardTitle>
              <CardDescription>
                View, modify, or add new school sections to the system.
              </CardDescription>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-1">
                  <Plus className="h-4 w-4" /> Add School
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Register New School</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <Label htmlFor="name">School Name *</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Sunrise School"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="e.g. 123 Sunshine Blvd, Nairobi"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="+254..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="info@school.com"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={submitCreate}>Create School</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {/* Search Filter */}
            <div className="relative mb-4 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search schools by name or address..."
                className="pl-9"
              />
            </div>

            {/* Schools Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School Details</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Teachers</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const schoolStudents = students.filter(
                    (p) => p.schoolId === s.id && p.active,
                  ).length;
                  const schoolTeachers = users.filter(
                    (u) => u.schoolId === s.id && u.role === "teacher" && u.status === "verified",
                  ).length;
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-semibold text-base">{s.name}</div>
                        {s.address && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <MapPin className="h-3 w-3 shrink-0" /> {s.address}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 text-xs text-muted-foreground">
                          {s.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {s.phone}
                            </div>
                          )}
                          {s.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {s.email}
                            </div>
                          )}
                          {!s.phone && !s.email && <span>-</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{schoolStudents}</span> students
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{schoolTeachers}</span> teachers
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(s.registeredAt)}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="icon" variant="ghost" onClick={() => startEdit(s)}>
                          <Edit2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(s.id, s.name)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No schools registered in the system.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit School Details - {editingSchool?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="edit-name">School Name *</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submitEdit}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
