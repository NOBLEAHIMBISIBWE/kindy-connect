import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useStore } from "@/lib/mock-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/teachers")({
  head: () => ({ meta: [{ title: "Teachers - Little Stars" }] }),
  component: TeachersPage,
});

function TeachersPage() {
  const { users, approveTeacher, rejectTeacher } = useStore();
  const teachers = users.filter((u) => u.role === "teacher");
  const pending = teachers.filter((t) => t.status === "pending");
  const verified = teachers.filter((t) => t.status === "verified");
  const rejected = teachers.filter((t) => t.status === "rejected");

  const renderTable = (list: typeof teachers, withActions = false) => (
    <Table>
      <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Registered</TableHead><TableHead>Status</TableHead>{withActions && <TableHead>Actions</TableHead>}</TableRow></TableHeader>
      <TableBody>
        {list.map((t) => (
          <TableRow key={t.id}>
            <TableCell className="font-medium">{t.name}</TableCell>
            <TableCell>{t.email}</TableCell>
            <TableCell>{t.phone}</TableCell>
            <TableCell>{t.registeredAt}</TableCell>
            <TableCell>
              <Badge variant={t.status === "verified" ? "default" : t.status === "rejected" ? "destructive" : "secondary"} className="capitalize">{t.status}</Badge>
            </TableCell>
            {withActions && (
              <TableCell className="space-x-2">
                <Button size="sm" onClick={() => { approveTeacher(t.id); toast.success(`${t.name} approved - email sent`); }}><Check className="h-4 w-4 mr-1" />Approve</Button>
                <Button size="sm" variant="destructive" onClick={() => { rejectTeacher(t.id); toast(`${t.name} rejected`); }}><X className="h-4 w-4 mr-1" />Reject</Button>
              </TableCell>
            )}
          </TableRow>
        ))}
        {list.length === 0 && <TableRow><TableCell colSpan={withActions ? 6 : 5} className="text-center text-muted-foreground py-8">No teachers in this category.</TableCell></TableRow>}
      </TableBody>
    </Table>
  );

  return (
    <AppShell title="Teacher accounts">
      <Card className="border-0 shadow-sm"><CardContent className="p-5">
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending {pending.length > 0 && <Badge className="ml-2 bg-accent text-accent-foreground">{pending.length}</Badge>}</TabsTrigger>
            <TabsTrigger value="verified">Verified</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="mt-4">{renderTable(pending, true)}</TabsContent>
          <TabsContent value="verified" className="mt-4">{renderTable(verified)}</TabsContent>
          <TabsContent value="rejected" className="mt-4">{renderTable(rejected)}</TabsContent>
        </Tabs>
      </CardContent></Card>
    </AppShell>
  );
}