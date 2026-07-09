import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/parents")({
  head: () => ({ meta: [{ title: "Parents - Little Stars" }] }),
  component: ParentsPage,
});

function ParentsPage() {
  const { parents, pupils, addParent } = useStore();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", relationship: "Mother" });

  const filtered = parents.filter((p) => `${p.name} ${p.phone} ${p.email}`.toLowerCase().includes(q.toLowerCase()));

  const submit = async () => {
    if (!form.name || !form.phone || !form.email) return toast.error("Fill all fields");
    await addParent(form);
    toast.success("Parent registered");
    setOpen(false);
    setForm({ name: "", phone: "", email: "", relationship: "Mother" });
  };

  return (
    <AppShell title="Parents & Guardians">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search parents..." className="pl-9" />
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Add parent</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Register parent / guardian</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Full name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+254..." /></div>
                  <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div><Label>Relationship</Label><Input value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} /></div>
                </div>
                <DialogFooter><Button onClick={submit}>Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead>Relationship</TableHead><TableHead>Children</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const kids = pupils.filter((k) => k.parentIds.includes(p.id));
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.phone}</TableCell>
                    <TableCell>{p.email}</TableCell>
                    <TableCell>{p.relationship}</TableCell>
                    <TableCell>{kids.map((k) => `${k.firstName} ${k.lastName}`).join(", ") || "-"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}