import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useStore } from "@/lib/mock-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/attendance")({
  head: () => ({ meta: [{ title: "Attendance - Little Stars" }] }),
  component: AttendancePage,
});

function AttendancePage() {
  const { currentUser, pupils, classes, attendance, markArrival, markDeparture } = useStore();
  const today = new Date().toISOString().slice(0, 10);
  const isTeacher = currentUser?.role === "teacher";
  const defaultClass = isTeacher ? currentUser?.classId ?? classes[0]?.id : classes[0]?.id;
  const [classId, setClassId] = useState<string>(defaultClass ?? "");
  const [date, setDate] = useState(today);

  const classPupils = pupils.filter((p) => p.classId === classId && p.active);
  const dayAtt = attendance.filter((a) => a.date === date);

  return (
    <AppShell title="Attendance">
      <Card className="border-0 shadow-sm"><CardContent className="p-5">
        <div className="flex flex-wrap gap-3 mb-4">
          <Select value={classId} onValueChange={setClassId} disabled={isTeacher}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm" />
        </div>

        <Table>
          <TableHeader><TableRow><TableHead>Pupil</TableHead><TableHead>Arrival</TableHead><TableHead>Departure</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {classPupils.map((p) => {
              const att = dayAtt.find((a) => a.pupilId === p.id);
              const isToday = date === today;
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.firstName} {p.lastName}</TableCell>
                  <TableCell>{att?.arrival ?? "-"}</TableCell>
                  <TableCell>{att?.departure ?? "-"}</TableCell>
                  <TableCell>
                    {att?.arrival ? <Badge>Present</Badge> : <Badge variant="secondary">Absent</Badge>}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" disabled={!isToday || !!att?.arrival} onClick={() => { markArrival(p.id); toast.success(`Arrival logged - parents notified`); }}>Arrival</Button>
                    <Button size="sm" variant="secondary" disabled={!isToday || !att?.arrival || !!att?.departure} onClick={() => { markDeparture(p.id); toast.success(`Departure logged - parents notified`); }}>Departure</Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {classPupils.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No pupils in this class.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </AppShell>
  );
}