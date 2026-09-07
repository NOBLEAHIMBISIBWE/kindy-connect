import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { CreditCard, Plus, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/app/fees")({
  head: () => ({ meta: [{ title: "Fees - Noble Edu" }] }),
  component: FeesPage,
});

const emptyForm = {
  pupilId: "",
  description: "Tuition",
  term: "Term 1",
  year: String(new Date().getFullYear()),
  amountDue: "",
  dueDate: "",
  notes: "",
};

const outstandingAmount = (amountDue: number, amountPaid: number) =>
  Math.max(0, amountDue - amountPaid);

function FeesPage() {
  const { fees, pupils, addFee, updateFee, refreshData, lastSyncTime, loading } = useStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [payment, setPayment] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasUserActivity, setHasUserActivity] = useState(true);

  // Track user activity to avoid unnecessary refreshes
  useEffect(() => {
    let activityTimer: NodeJS.Timeout;
    
    const resetActivityTimer = () => {
      setHasUserActivity(true);
      clearTimeout(activityTimer);
      activityTimer = setTimeout(() => setHasUserActivity(false), 60000); // 1 minute
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetActivityTimer, true));

    // Set initial timer
    resetActivityTimer();

    return () => {
      events.forEach(event => document.removeEventListener(event, resetActivityTimer, true));
      clearTimeout(activityTimer);
    };
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-refresh every 30 seconds when online and user is active
  useEffect(() => {
    if (!isOnline || !hasUserActivity) return;

    const interval = setInterval(async () => {
      try {
        // Only auto-refresh if user has been active and we're online
        if (hasUserActivity && isOnline && !loading) {
          await refreshData();
        }
      } catch (error) {
        console.error('Auto-refresh failed:', error);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [refreshData, isOnline, hasUserActivity, loading]);

  // Refresh on window focus and when coming back online
  useEffect(() => {
    const handleFocus = async () => {
      if (isOnline) {
        try {
          await refreshData();
        } catch (error) {
          console.error('Focus refresh failed:', error);
        }
      }
    };

    const handleOnlineRefresh = async () => {
      // Refresh immediately when coming back online
      try {
        await refreshData();
        toast.success("Reconnected - fees data refreshed");
      } catch (error) {
        console.error('Online refresh failed:', error);
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnlineRefresh);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnlineRefresh);
    };
  }, [refreshData, isOnline]);

  // Manual refresh function with enhanced feedback
  const handleManualRefresh = async () => {
    if (!isOnline) {
      toast.error("No internet connection");
      return;
    }

    setIsRefreshing(true);
    try {
      await refreshData();
      toast.success("Fees data refreshed");
    } catch (error: any) {
      toast.error(error?.message || "Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  };
  const pupilName = (id: string) => {
    const pupil = pupils.find((item) => item.id === id);
    return pupil ? `${pupil.firstName} ${pupil.lastName}` : "Unknown pupil";
  };
  const visibleFees = useMemo(
    () =>
      fees.filter((fee) => {
        const matchesQuery = `${pupilName(fee.pupilId)} ${fee.description}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const dueAmount = outstandingAmount(fee.amountDue, fee.amountPaid);
        return (
          matchesQuery &&
          (status === "all" || (status === "paid" ? dueAmount === 0 : dueAmount > 0))
        );
      }),
    [fees, pupils, query, status],
  );
  const totalDue = fees.reduce((sum, fee) => sum + fee.amountDue, 0);
  const totalPaid = fees.reduce((sum, fee) => sum + fee.amountPaid, 0);
  const totalOutstanding = fees.reduce(
    (sum, fee) => sum + outstandingAmount(fee.amountDue, fee.amountPaid),
    0,
  );

  const submit = async () => {
    const amountDue = Number(form.amountDue);
    if (!form.pupilId || !form.description.trim() || !Number.isFinite(amountDue) || amountDue <= 0)
      return toast.error("Choose a pupil and enter a valid amount");
    try {
      await addFee({
        pupilId: form.pupilId,
        schoolId: pupils.find((pupil) => pupil.id === form.pupilId)?.schoolId || "",
        description: form.description.trim(),
        term: form.term,
        year: form.year,
        amountDue,
        amountPaid: 0,
        dueDate: form.dueDate || undefined,
        notes: form.notes.trim() || undefined,
      });
      toast.success("Fee charge added");
      setForm(emptyForm);
      setOpen(false);
      
      // Auto-refresh after adding fee
      await refreshData();
    } catch (error: any) {
      toast.error(error?.message || "Could not add fee charge");
    }
  };

  const recordPayment = async () => {
    const fee = fees.find((item) => item.id === paymentId);
    const amount = Number(payment);
    const dueAmount = fee ? outstandingAmount(fee.amountDue, fee.amountPaid) : 0;
    if (!fee || !Number.isFinite(amount) || amount <= 0 || amount > dueAmount)
      return toast.error("Enter a payment within the outstanding balance");
    try {
      await updateFee(fee.id, { amountPaid: fee.amountPaid + amount });
      toast.success("Payment recorded");
      setPaymentId(null);
      setPayment("");
      
      // Auto-refresh after payment
      await refreshData();
    } catch (error: any) {
      toast.error(error?.message || "Could not record payment");
    }
  };

  return (
    <AppShell title="Fees & Payments">
      <div className="space-y-5">
        {/* Connection and sync status */}
        <div className="flex gap-2">
          {!isOnline && (
            <div className="bg-red-50 border border-red-200 rounded-md p-2 flex-1">
              <div className="flex items-center gap-2 text-red-700">
                <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                <span className="text-sm">Offline - Data may not be current</span>
              </div>
            </div>
          )}
          
          {loading && isOnline && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-2 flex-1">
              <div className="flex items-center gap-2 text-blue-700">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Syncing fees data...</span>
              </div>
            </div>
          )}

          {isOnline && !loading && lastSyncTime && (
            <div className="bg-green-50 border border-green-200 rounded-md p-2 flex-1">
              <div className="flex items-center gap-2 text-green-700">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Auto-sync active • Last update: {lastSyncTime}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="grid gap-4 sm:grid-cols-3">
          <Summary title="Total billed" value={totalDue} />
          <Summary title="Collected" value={totalPaid} tone="text-emerald-600" />
          <Summary title="Outstanding" value={totalOutstanding} tone="text-amber-600" />
        </div>
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Fee ledger</CardTitle>
              {lastSyncTime && isOnline && (
                <Badge variant="outline" className="text-xs">
                  Updated: {lastSyncTime}
                </Badge>
              )}
              {!isOnline && (
                <Badge variant="destructive" className="text-xs">
                  Offline
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleManualRefresh}
                disabled={isRefreshing || loading || !isOnline}
                className={!isOnline ? "opacity-50 cursor-not-allowed" : ""}
              >
                <RefreshCw className={`mr-1 h-4 w-4 ${isRefreshing || loading ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : !isOnline ? 'Offline' : 'Refresh'}
              </Button>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-1 h-4 w-4" />
                    Add charge
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add fee charge</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>Pupil</Label>
                    <Select
                      value={form.pupilId}
                      onValueChange={(value) => setForm({ ...form, pupilId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select pupil" />
                      </SelectTrigger>
                      <SelectContent>
                        {pupils
                          .filter((pupil) => pupil.active)
                          .map((pupil) => (
                            <SelectItem key={pupil.id} value={pupil.id}>
                              {pupil.firstName} {pupil.lastName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={form.description}
                      onChange={(event) => setForm({ ...form, description: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.amountDue}
                      onChange={(event) => setForm({ ...form, amountDue: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Term</Label>
                    <Select
                      value={form.term}
                      onValueChange={(value) => setForm({ ...form, term: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Term 1", "Term 2", "Term 3"].map((term) => (
                          <SelectItem key={term} value={term}>
                            {term}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Year</Label>
                    <Input
                      value={form.year}
                      onChange={(event) => setForm({ ...form, year: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Due date</Label>
                    <Input
                      type="date"
                      value={form.dueDate}
                      onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Input
                      value={form.notes}
                      onChange={(event) => setForm({ ...form, notes: event.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={submit}>Save charge</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search pupils or charges..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="outstanding">Outstanding</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pupil</TableHead>
                  <TableHead>Charge</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Due amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleFees.map((fee) => {
                  const dueAmount = outstandingAmount(fee.amountDue, fee.amountPaid);
                  return (
                    <TableRow key={fee.id}>
                      <TableCell className="font-medium">{pupilName(fee.pupilId)}</TableCell>
                      <TableCell>{fee.description}</TableCell>
                      <TableCell>
                        {fee.term} {fee.year}
                      </TableCell>
                      <TableCell>{dueAmount.toFixed(2)}</TableCell>
                      <TableCell>{fee.amountPaid.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={dueAmount === 0 ? "secondary" : "outline"}>
                          {dueAmount === 0 ? "Paid" : `${dueAmount.toFixed(2)} due`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {dueAmount > 0 && (
                          <Button size="sm" variant="outline" onClick={() => setPaymentId(fee.id)}>
                            <CreditCard className="mr-1 h-3.5 w-3.5" />
                            Pay
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {!visibleFees.length && (
              <div className="py-10 text-center">
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading fees data...</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No fee records match this view.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Dialog open={paymentId !== null} onOpenChange={(value) => !value && setPaymentId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
          </DialogHeader>
          <Label>Payment amount</Label>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={payment}
            onChange={(event) => setPayment(event.target.value)}
          />
          <DialogFooter>
            <Button onClick={recordPayment}>Record payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Summary({ title, value, tone = "" }: { title: string; value: number; tone?: string }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value.toFixed(2)}</p>
      </CardContent>
    </Card>
  );
}
