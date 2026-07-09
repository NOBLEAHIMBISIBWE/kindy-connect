import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useStore } from "@/lib/mock-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Plus, UserPlus, Ban, UserMinus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/schools")({ component: SchoolsPage });

function SchoolsPage() {
  const { currentUser, schools, users, createSchool, deactivateSchool, createSchoolAdmin, assignAdminToSchool, unassignAdmin } = useStore();

  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", phone: "", email: "" });

  const [adminOpenFor, setAdminOpenFor] = useState<string | null>(null);
  const [adminForm, setAdminForm] = useState({ name: "", email: "", phone: "", password: "" });

  const [assignOpenFor, setAssignOpenFor] = useState<string | null>(null);
  const [assignUserId, setAssignUserId] = useState<string>("");

  if (!currentUser || currentUser.role !== "superadmin") {
    return (
      <AppShell title="Schools">
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Only the super admin can manage schools.</CardContent></Card>
      </AppShell>
    );
  }

  const adminsFor = (schoolId: string) => users.filter((u) => u.role === "admin" && u.schoolId === schoolId);
  const unassignedAdmins = users.filter((u) => u.role === "admin" && !u.schoolId);

  const submitSchool = () => {
    if (!form.name.trim()) return toast.error("School name is required");
    createSchool(form);
    toast.success("School created");
    setForm({ name: "", location: "", phone: "", email: "" });
    setNewOpen(false);
  };

  const submitAdmin = () => {
    if (!adminOpenFor) return;
    if (!adminForm.name || !adminForm.email || !adminForm.password) return toast.error("Name, email and password are required");
    const u = createSchoolAdmin(adminOpenFor, adminForm);
    if (!u) return toast.error("Email already in use");
    toast.success(`Admin account created for ${u.name}`);
    setAdminForm({ name: "", email: "", phone: "", password: "" });
    setAdminOpenFor(null);
  };

  const submitAssign = () => {
    if (!assignOpenFor || !assignUserId) return toast.error("Choose an admin");
    assignAdminToSchool(assignUserId, assignOpenFor);
    toast.success("Admin assigned");
    setAssignUserId("");
    setAssignOpenFor(null);
  };

  return (
    <AppShell title="Schools">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">Create schools and assign admins to manage them.</p>
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> New school</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create school</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>School name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter><Button onClick={submitSchool}>Create school</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {schools.length === 0 && (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">No schools yet — create the first one.</CardContent></Card>
        )}
        {schools.map((s) => {
          const admins = adminsFor(s.id);
          return (
            <Card key={s.id} className={s.active ? "" : "opacity-60"}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{s.name} {!s.active && <Badge variant="outline" className="ml-2">Inactive</Badge>}</CardTitle>
                    <div className="text-xs text-muted-foreground mt-1">
                      {s.location || "—"} · {s.phone || "no phone"} · {s.email || "no email"}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Dialog open={adminOpenFor === s.id} onOpenChange={(o) => setAdminOpenFor(o ? s.id : null)}>
                    <DialogTrigger asChild>
                      <Button size="sm"><UserPlus className="h-4 w-4 mr-1" /> Create admin</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Create admin for {s.name}</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div><Label>Full name</Label><Input value={adminForm.name} onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })} /></div>
                        <div><Label>Email</Label><Input type="email" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} /></div>
                        <div><Label>Phone</Label><Input value={adminForm.phone} onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })} /></div>
                        <div><Label>Temporary password</Label><Input type="text" value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} /></div>
                      </div>
                      <DialogFooter><Button onClick={submitAdmin}>Create admin</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={assignOpenFor === s.id} onOpenChange={(o) => setAssignOpenFor(o ? s.id : null)}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">Assign existing admin</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Assign admin to {s.name}</DialogTitle></DialogHeader>
                      {unassignedAdmins.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No unassigned admins available.</p>
                      ) : (
                        <div>
                          <Label>Choose admin</Label>
                          <select
                            value={assignUserId}
                            onChange={(e) => setAssignUserId(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm mt-1"
                          >
                            <option value="">Select…</option>
                            {unassignedAdmins.map((u) => (
                              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <DialogFooter><Button onClick={submitAssign} disabled={!assignUserId}>Assign</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {s.active && (
                    <Button size="sm" variant="ghost" onClick={() => { deactivateSchool(s.id); toast.success("School deactivated"); }}>
                      <Ban className="h-4 w-4 mr-1" /> Deactivate
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium mb-2">Assigned admins ({admins.length})</div>
                {admins.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No admins assigned yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="w-24 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {admins.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.name}</TableCell>
                          <TableCell>{a.email}</TableCell>
                          <TableCell>{a.phone || "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => { unassignAdmin(a.id); toast.success("Admin unassigned"); }}>
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}