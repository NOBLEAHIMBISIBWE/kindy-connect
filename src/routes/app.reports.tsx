import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useStore } from "@/lib/mock-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/reports")({
  head: () => ({ meta: [{ title: "Reports - Little Stars" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const { pupils, attendance, classes } = useStore();
  const today = new Date().toISOString().slice(0, 10);
  const todayAtt = attendance.filter((a) => a.date === today);

  const lateThreshold = "08:00";
  const late = todayAtt.filter((a) => a.arrival && a.arrival > lateThreshold);

  const exportToast = (kind: string) => toast.success(`${kind} export prepared (demo)`);

  return (
    <AppShell title="Reports">
      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="late">Late arrivals</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Today - {today}</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => exportToast("PDF")}><FileText className="h-4 w-4 mr-1" />PDF</Button>
                <Button size="sm" variant="outline" onClick={() => exportToast("Excel")}><FileSpreadsheet className="h-4 w-4 mr-1" />Excel</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Pupil</TableHead><TableHead>Class</TableHead><TableHead>Arrival</TableHead><TableHead>Departure</TableHead></TableRow></TableHeader>
                <TableBody>
                  {todayAtt.map((a) => {
                    const p = pupils.find((x) => x.id === a.pupilId);
                    if (!p) return null;
                    return (
                      <TableRow key={a.id}>
                        <TableCell>{p.firstName} {p.lastName}</TableCell>
                        <TableCell>{classes.find((c) => c.id === p.classId)?.name}</TableCell>
                        <TableCell>{a.arrival ?? "-"}</TableCell>
                        <TableCell>{a.departure ?? "-"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="mt-4">
          <Card><CardContent className="p-8 text-center text-muted-foreground"><Download className="h-8 w-8 mx-auto mb-3" />Weekly report aggregates this week's attendance per pupil. Export to PDF or Excel.</CardContent></Card>
        </TabsContent>
        <TabsContent value="monthly" className="mt-4">
          <Card><CardContent className="p-8 text-center text-muted-foreground"><Download className="h-8 w-8 mx-auto mb-3" />Monthly report aggregates the month's attendance per pupil and class. Export to PDF or Excel.</CardContent></Card>
        </TabsContent>

        <TabsContent value="late" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Late arrivals (after {lateThreshold})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Pupil</TableHead><TableHead>Arrival</TableHead></TableRow></TableHeader>
                <TableBody>
                  {late.map((a) => {
                    const p = pupils.find((x) => x.id === a.pupilId);
                    if (!p) return null;
                    return <TableRow key={a.id}><TableCell>{p.firstName} {p.lastName}</TableCell><TableCell>{a.arrival}</TableCell></TableRow>;
                  })}
                  {late.length === 0 && <TableRow><TableCell colSpan={2} className="text-center py-6 text-muted-foreground">No late arrivals today</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}