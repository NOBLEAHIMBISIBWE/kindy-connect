import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/teachers")({
  head: () => ({ meta: [{ title: "Users - Little Stars" }] }),
  component: TeachersPage,
});

function TeachersPage() {
  const { currentUser, users, approveTeacher, rejectTeacher } = useStore();
  
  const isCurrentUserAdmin = currentUser?.role === "admin";
  const listToDisplay = isCurrentUserAdmin ? users : users.filter((u) => u.role === "teacher");
  
  const pending = listToDisplay.filter((t) => t.status === "pending");
  const verified = listToDisplay.filter((t) => t.status === "verified");
  const rejected = listToDisplay.filter((t) => t.status === "rejected");

  const renderTable = (list: typeof users, withActions = false) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          {isCurrentUserAdmin && <TableHead>Role</TableHead>}
          {isCurrentUserAdmin && <TableHead>Password</TableHead>}
          <TableHead>Registered</TableHead>
          <TableHead>Status</TableHead>
          {withActions && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.map((t) => (
          <TableRow key={t.id}>
            <TableCell className="font-medium">{t.name}</TableCell>
            <TableCell>{t.email}</TableCell>
            <TableCell>{t.phone}</TableCell>
            {isCurrentUserAdmin && <TableCell className="capitalize">{t.role}</TableCell>}
            {isCurrentUserAdmin && <TableCell className="font-mono text-xs">{t.password || "N/A"}</TableCell>}
            <TableCell>{t.registeredAt}</TableCell>
            <TableCell>
              <Badge variant={t.status === "verified" ? "default" : t.status === "rejected" ? "destructive" : "secondary"} className="capitalize">{t.status}</Badge>
            </TableCell>
            {withActions && (
              <TableCell className="space-x-2">
                <Button size="sm" onClick={async () => { await approveTeacher(t.id); toast.success(`${t.name} approved`); }}><Check className="h-4 w-4 mr-1" />Approve</Button>
                <Button size="sm" variant="destructive" onClick={async () => { await rejectTeacher(t.id); toast(`${t.name} rejected`); }}><X className="h-4 w-4 mr-1" />Reject</Button>
              </TableCell>
            )}
          </TableRow>
        ))}
        {list.length === 0 && (
          <TableRow>
            <TableCell colSpan={withActions ? (isCurrentUserAdmin ? 8 : 6) : (isCurrentUserAdmin ? 7 : 5)} className="text-center text-muted-foreground py-8">
              No accounts in this category.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <AppShell title={isCurrentUserAdmin ? "User accounts" : "Teacher accounts"}>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
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
        </CardContent>
      </Card>
    </AppShell>
  );
}