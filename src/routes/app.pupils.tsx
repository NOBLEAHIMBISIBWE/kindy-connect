import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useStore, type Pupil } from "@/lib/mock-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/pupils")({
  head: () => ({ meta: [{ title: "Pupils - Little Stars" }] }),
  component: PupilsPage,
});

function PupilsPage() {
  const { pupils, classes, parents, addPupil, deactivatePupil } = useStore();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ admissionNo: "", firstName: "", lastName: "", gender: "M" as "M" | "F", dob: "", classId: classes[0]?.id ?? "", parentIds: [] as string[] });

  const filtered = pupils.filter(
    (p) => `${p.firstName} ${p.lastName} ${p.admissionNo}`.toLowerCase().includes(q.toLowerCase()),
  );

  const submit = () => {
    if (!form.admissionNo || !form.firstName || !form.lastName) return toast.error("Fill required fields");
    if (pupils.some((p) => p.admissionNo === form.admissionNo)) return toast.error("Admission number already exists");
    addPupil(form as Omit<Pupil, "id" | "active">);
    toast.success("Pupil registered");
    setOpen(false);
    setForm({ admissionNo: "", firstName: "", lastName: "", gender: "M", dob: "", classId: classes[0]?.id ?? "", parentIds: [] });
  };

  return (
    <AppShell title="Pupils">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or admission no..." className="pl-9" />
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" /> Register pupil</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Register new pupil</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label>Admission number</Label><Input value={form.admissionNo} onChange={(e) => setForm({ ...form, admissionNo: e.target.value })} /></div>
                  <div><Label>First name</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
                  <div><Label>Last name</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
                  <div><Label>Gender</Label>
                    <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as "M" | "F" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="M">Male</SelectItem><SelectItem value="F">Female</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Date of birth</Label><Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></div>
                  <div className="col-span-2"><Label>Class</Label>
                    <Select value={form.classId} onValueChange={(v) => setForm({ ...form, classId: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2"><Label>Link parent (optional)</Label>
                    <Select value={form.parentIds[0] ?? ""} onValueChange={(v) => setForm({ ...form, parentIds: v ? [v] : [] })}>
                      <SelectTrigger><SelectValue placeholder="Choose parent" /></SelectTrigger>
                      <SelectContent>{parents.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.relationship})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter><Button onClick={submit}>Save pupil</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Adm. No</TableHead><TableHead>Name</TableHead><TableHead>Class</TableHead><TableHead>Gender</TableHead><TableHead>Guardians</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.admissionNo}</TableCell>
                  <TableCell className="font-medium">{p.firstName} {p.lastName}</TableCell>
                  <TableCell>{classes.find((c) => c.id === p.classId)?.name ?? "-"}</TableCell>
                  <TableCell>{p.gender === "M" ? "Male" : "Female"}</TableCell>
                  <TableCell>{p.parentIds.length}</TableCell>
                  <TableCell>{p.active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                  <TableCell className="text-right">
                    {p.active && <Button size="sm" variant="ghost" onClick={() => { deactivatePupil(p.id); toast.success("Pupil deactivated"); }}>Deactivate</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}