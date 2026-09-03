import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CreditCard, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/app/fees")({
  head: () => ({ meta: [{ title: "Fees - Noble Edu" }] }),
  component: FeesPage,
});

const emptyForm = { pupilId: "", description: "Tuition", term: "Term 1", year: String(new Date().getFullYear()), amountDue: "", dueDate: "", notes: "" };

const outstandingAmount = (amountDue: number, amountPaid: number) => Math.max(0, amountDue - amountPaid);

function FeesPage() {
  const { fees, pupils, addFee, updateFee } = useStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [payment, setPayment] = useState("");
  const [form, setForm] = useState(emptyForm);
  const pupilName = (id: string) => { const pupil = pupils.find((item) => item.id === id); return pupil ? `${pupil.firstName} ${pupil.lastName}` : "Unknown pupil"; };
  const visibleFees = useMemo(() => fees.filter((fee) => {
    const matchesQuery = `${pupilName(fee.pupilId)} ${fee.description}`.toLowerCase().includes(query.toLowerCase());
    const dueAmount = outstandingAmount(fee.amountDue, fee.amountPaid);
    return matchesQuery && (status === "all" || (status === "paid" ? dueAmount === 0 : dueAmount > 0));
  }), [fees, pupils, query, status]);
  const totalDue = fees.reduce((sum, fee) => sum + fee.amountDue, 0);
  const totalPaid = fees.reduce((sum, fee) => sum + fee.amountPaid, 0);
  const totalOutstanding = fees.reduce((sum, fee) => sum + outstandingAmount(fee.amountDue, fee.amountPaid), 0);

  const submit = async () => {
    const amountDue = Number(form.amountDue);
    if (!form.pupilId || !form.description.trim() || !Number.isFinite(amountDue) || amountDue <= 0) return toast.error("Choose a pupil and enter a valid amount");
    try {
      await addFee({ pupilId: form.pupilId, schoolId: pupils.find((pupil) => pupil.id === form.pupilId)?.schoolId || "", description: form.description.trim(), term: form.term, year: form.year, amountDue, amountPaid: 0, dueDate: form.dueDate || undefined, notes: form.notes.trim() || undefined });
      toast.success("Fee charge added"); setForm(emptyForm); setOpen(false);
    } catch (error: any) { toast.error(error?.message || "Could not add fee charge"); }
  };

  const recordPayment = async () => {
    const fee = fees.find((item) => item.id === paymentId);
    const amount = Number(payment);
    const dueAmount = fee ? outstandingAmount(fee.amountDue, fee.amountPaid) : 0;
    if (!fee || !Number.isFinite(amount) || amount <= 0 || amount > dueAmount) return toast.error("Enter a payment within the outstanding balance");
    try { await updateFee(fee.id, { amountPaid: fee.amountPaid + amount }); toast.success("Payment recorded"); setPaymentId(null); setPayment(""); } catch (error: any) { toast.error(error?.message || "Could not record payment"); }
  };

  return <AppShell title="Fees & Payments">
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Summary title="Total billed" value={totalDue} />
        <Summary title="Collected" value={totalPaid} tone="text-emerald-600" />
        <Summary title="Outstanding" value={totalOutstanding} tone="text-amber-600" />
      </div>
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Fee ledger</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />Add charge</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Add fee charge</DialogTitle></DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label>Pupil</Label><Select value={form.pupilId} onValueChange={(value) => setForm({ ...form, pupilId: value })}><SelectTrigger><SelectValue placeholder="Select pupil" /></SelectTrigger><SelectContent>{pupils.filter((pupil) => pupil.active).map((pupil) => <SelectItem key={pupil.id} value={pupil.id}>{pupil.firstName} {pupil.lastName}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Description</Label><Input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
                <div><Label>Amount</Label><Input type="number" min="0.01" step="0.01" value={form.amountDue} onChange={(event) => setForm({ ...form, amountDue: event.target.value })} /></div>
                <div><Label>Term</Label><Select value={form.term} onValueChange={(value) => setForm({ ...form, term: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Term 1", "Term 2", "Term 3"].map((term) => <SelectItem key={term} value={term}>{term}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Year</Label><Input value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} /></div>
                <div><Label>Due date</Label><Input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></div>
                <div><Label>Notes</Label><Input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div>
              </div><DialogFooter><Button onClick={submit}>Save charge</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search pupils or charges..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><Select value={status} onValueChange={setStatus}><SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="outstanding">Outstanding</SelectItem></SelectContent></Select></div>
          <Table><TableHeader><TableRow><TableHead>Pupil</TableHead><TableHead>Charge</TableHead><TableHead>Term</TableHead><TableHead>Due amount</TableHead><TableHead>Paid</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{visibleFees.map((fee) => { const dueAmount = outstandingAmount(fee.amountDue, fee.amountPaid); return <TableRow key={fee.id}><TableCell className="font-medium">{pupilName(fee.pupilId)}</TableCell><TableCell>{fee.description}</TableCell><TableCell>{fee.term} {fee.year}</TableCell><TableCell>{dueAmount.toFixed(2)}</TableCell><TableCell>{fee.amountPaid.toFixed(2)}</TableCell><TableCell><Badge variant={dueAmount === 0 ? "secondary" : "outline"}>{dueAmount === 0 ? "Paid" : `${dueAmount.toFixed(2)} due`}</Badge></TableCell><TableCell className="text-right">{dueAmount > 0 && <Button size="sm" variant="outline" onClick={() => setPaymentId(fee.id)}><CreditCard className="mr-1 h-3.5 w-3.5" />Pay</Button>}</TableCell></TableRow>; })}</TableBody></Table>
          {!visibleFees.length && <p className="py-10 text-center text-sm text-muted-foreground">No fee records match this view.</p>}
        </CardContent>
      </Card>
    </div>
    <Dialog open={paymentId !== null} onOpenChange={(value) => !value && setPaymentId(null)}><DialogContent><DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader><Label>Payment amount</Label><Input type="number" min="0.01" step="0.01" value={payment} onChange={(event) => setPayment(event.target.value)} /><DialogFooter><Button onClick={recordPayment}>Record payment</Button></DialogFooter></DialogContent></Dialog>
  </AppShell>;
}

function Summary({ title, value, tone = "" }: { title: string; value: number; tone?: string }) { return <Card className="border-0 shadow-sm"><CardContent className="p-5"><p className="text-sm text-muted-foreground">{title}</p><p className={`mt-1 text-2xl font-semibold ${tone}`}>{value.toFixed(2)}</p></CardContent></Card>; }
