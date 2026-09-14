import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/app/fees")({
  head: () => ({ meta: [{ title: "Fees - Noble Edu" }] }),
  component: FeesPage,
});

function FeesPage() {
  const {
    currentUser,
    schools,
    pupils,
    feeStructures,
    feeCharges,
    feePayments,
    selectedSchoolId,
    addFeeStructure,
    assignFeeCharges,
    addFeePayment,
    refreshData,
    lastSyncTime,
  } = useStore();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [term, setTerm] = useState("Term 1");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [structureId, setStructureId] = useState("");
  const [selectedPupils, setSelectedPupils] = useState<string[]>([]);
  const [assignAll, setAssignAll] = useState(true);
  const [paymentChargeId, setPaymentChargeId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [filter, setFilter] = useState("");

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Refresh when page becomes visible (user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshData]);

  // Refresh when coming back online
  useEffect(() => {
    const handleOnline = () => {
      refreshData();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [refreshData]);

  const canManage =
    currentUser?.role === "super_admin" ||
    currentUser?.role === "admin" ||
    currentUser?.role === "deputy";
  const schoolId =
    currentUser?.role === "super_admin"
      ? selectedSchoolId || schools[0]?.id
      : currentUser?.schoolId;
  const schoolPupils = useMemo(
    () => pupils.filter((p) => p.schoolId === schoolId && p.active),
    [pupils, schoolId],
  );
  const schoolStructures = useMemo(
    () => feeStructures.filter((f) => f.schoolId === schoolId),
    [feeStructures, schoolId],
  );
  const schoolCharges = useMemo(
    () => feeCharges.filter((c) => c.schoolId === schoolId),
    [feeCharges, schoolId],
  );
  const schoolPayments = useMemo(
    () => feePayments.filter((p) => p.schoolId === schoolId),
    [feePayments, schoolId],
  );
  const paymentOptions = useMemo(
    () =>
      schoolCharges
        .map((charge) => {
          const pupil = pupils.find((p) => p.id === charge.pupilId);
          const structure = feeStructures.find((f) => f.id === charge.feeStructureId);
          const paid = schoolPayments
            .filter((p) => p.chargeId === charge.id)
            .reduce((sum, p) => sum + Number(p.amount), 0);
          return { charge, pupil, structure, paid, balance: Number(charge.amount) - paid };
        })
        .filter((item) => item.balance > 0),
    [schoolCharges, pupils, feeStructures, schoolPayments],
  );
  const visibleCharges = schoolCharges.filter((charge) => {
    const pupil = pupils.find((p) => p.id === charge.pupilId);
    const structure = feeStructures.find((f) => f.id === charge.feeStructureId);
    return `${pupil?.firstName} ${pupil?.lastName} ${structure?.name}`
      .toLowerCase()
      .includes(filter.toLowerCase());
  });
  const totals = schoolCharges.reduce(
    (result, charge) => {
      result.due += Number(charge.amount);
      result.paid += schoolPayments
        .filter((payment) => payment.chargeId === charge.id)
        .reduce((sum, payment) => sum + Number(payment.amount), 0);
      return result;
    },
    { due: 0, paid: 0 },
  );

  const createStructure = async () => {
    if (!schoolId || !name.trim() || Number(amount) <= 0 || !Number(year)) {
      return toast.error("Choose a school and enter a name, positive amount, and year");
    }
    try {
      const structure = await addFeeStructure({
        schoolId,
        name: name.trim(),
        amount: Number(amount),
        term,
        year: Number(year),
      });
      setStructureId(structure.id);
      setName("");
      setAmount("");
      toast.success("Fee charge configured");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not configure charge");
    }
  };

  const assignCharges = async () => {
    if (!structureId || (!assignAll && selectedPupils.length === 0)) {
      return toast.error("Choose a charge and at least one pupil");
    }
    try {
      await assignFeeCharges(structureId, assignAll ? undefined : selectedPupils, assignAll);
      setSelectedPupils([]);
      toast.success(assignAll ? "Charge assigned to all active pupils" : "Charge assigned");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not assign charge");
    }
  };

  const recordPayment = async () => {
    if (!paymentChargeId || Number(paymentAmount) <= 0) {
      return toast.error("Choose a balance and enter a positive payment");
    }
    try {
      await addFeePayment({
        chargeId: paymentChargeId,
        amount: Number(paymentAmount),
        paidOn,
        reference: reference.trim() || undefined,
      });
      setPaymentAmount("");
      setReference("");
      toast.success("Payment recorded");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not record payment");
    }
  };

  if (!canManage) {
    return (
      <AppShell title="Fees">
        <Card>
          <CardContent className="p-6">
            Fees are available to administrators and deputies.
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="Fees & balances">
      <div className="space-y-5">
        {/* Sync indicator */}
        {lastSyncTime && (
          <div className="flex justify-end">
            <Badge variant="outline" className="text-xs">
              Last updated: {lastSyncTime}
            </Badge>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Total due</p>
              <p className="text-2xl font-bold">{totals.due.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Collected</p>
              <p className="text-2xl font-bold text-emerald-600">{totals.paid.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Outstanding</p>
              <p className="text-2xl font-bold text-amber-600">
                {(totals.due - totals.paid).toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Configure a charge</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tuition"
                />
              </div>
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Term</Label>
                  <Input value={term} onChange={(e) => setTerm(e.target.value)} />
                </div>
                <div>
                  <Label>Year</Label>
                  <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
                </div>
              </div>
              <Button className="w-full" onClick={createStructure}>
                Save charge
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assign to pupils</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Configured charge</Label>
                <select
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                  value={structureId}
                  onChange={(e) => setStructureId(e.target.value)}
                >
                  <option value="">Select a charge</option>
                  {schoolStructures.map((structure) => (
                    <option key={structure.id} value={structure.id}>
                      {structure.name} · {structure.term} {structure.year}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={assignAll}
                  onChange={(e) => setAssignAll(e.target.checked)}
                />{" "}
                Assign to all active pupils
              </label>
              {!assignAll && (
                <select
                  multiple
                  className="h-28 w-full rounded-md border bg-transparent p-2 text-sm"
                  value={selectedPupils}
                  onChange={(e) =>
                    setSelectedPupils(
                      Array.from(e.target.selectedOptions, (option) => option.value),
                    )
                  }
                >
                  {schoolPupils.map((pupil) => (
                    <option key={pupil.id} value={pupil.id}>
                      {pupil.firstName} {pupil.lastName}
                    </option>
                  ))}
                </select>
              )}
              <Button className="w-full" variant="secondary" onClick={assignCharges}>
                Assign charge
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Record a payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Pupil charge</Label>
                <select
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                  value={paymentChargeId}
                  onChange={(e) => setPaymentChargeId(e.target.value)}
                >
                  <option value="">Select an outstanding balance</option>
                  {paymentOptions.map(({ charge, pupil, structure, balance }) => (
                    <option key={charge.id} value={charge.id}>
                      {pupil?.firstName} {pupil?.lastName} · {structure?.name} · balance{" "}
                      {balance.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Paid on</Label>
                  <Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Reference (optional)</Label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Receipt number"
                />
              </div>
              <Button className="w-full" onClick={recordPayment}>
                Record payment
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Balances</CardTitle>
            <Input
              className="max-w-xs"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter pupil or charge..."
            />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pupil</TableHead>
                  <TableHead>Charge</TableHead>
                  <TableHead>Term / year</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleCharges.map((charge) => {
                  const pupil = pupils.find((p) => p.id === charge.pupilId);
                  const structure = feeStructures.find((f) => f.id === charge.feeStructureId);
                  const paid = schoolPayments
                    .filter((p) => p.chargeId === charge.id)
                    .reduce((sum, p) => sum + Number(p.amount), 0);
                  const balance = Number(charge.amount) - paid;
                  return (
                    <TableRow key={charge.id}>
                      <TableCell className="font-medium">
                        {pupil?.firstName} {pupil?.lastName}
                      </TableCell>
                      <TableCell>{structure?.name || "-"}</TableCell>
                      <TableCell>
                        {structure?.term} {structure?.year}
                      </TableCell>
                      <TableCell>{Number(charge.amount).toFixed(2)}</TableCell>
                      <TableCell>{paid.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={balance > 0 ? "secondary" : "default"}>
                          {balance.toFixed(2)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {visibleCharges.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No charges assigned yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
