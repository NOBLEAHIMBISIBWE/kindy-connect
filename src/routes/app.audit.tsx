import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useStore } from "@/lib/mock-store";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/app/audit")({
  head: () => ({ meta: [{ title: "Audit log - Little Stars" }] }),
  component: AuditPage,
});

function AuditPage() {
  const { audit } = useStore();
  return (
    <AppShell title="Audit log">
      <Card className="border-0 shadow-sm"><CardContent className="p-5">
        <Table>
          <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Who</TableHead><TableHead>Action</TableHead><TableHead>Target</TableHead></TableRow></TableHeader>
          <TableBody>
            {audit.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="text-xs text-muted-foreground">{new Date(a.timestamp).toLocaleString()}</TableCell>
                <TableCell className="font-medium">{a.actorName}</TableCell>
                <TableCell>{a.action}</TableCell>
                <TableCell>{a.target}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </AppShell>
  );
}