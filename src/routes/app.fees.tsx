import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useCallback } from "react";
import { CreditCard, Plus, Search, RefreshCw, Download, Calendar, AlertTriangle, TrendingUp, Receipt, DollarSign, Clock, FileText, Filter } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/app/fees")({
  head: () => ({ meta: [{ title: "Fees - Noble Edu" }] }),
  component: FeesPage,
});

const emptyForm = {
  pupilId: "",
  description: "Tuition Fee",
  term: "Term 1",
  year: String(new Date().getFullYear()),
  amountDue: "",
  dueDate: "",
  notes: "",
};

const feeCategories = [
  "Tuition Fee",
  "Transport Fee",
  "Meal Fee",
  "Activity Fee",
  "Uniform Fee",
  "Books & Materials",
  "Examination Fee",
  "Registration Fee",
  "Medical Fee",
  "Field Trip",
  "Other"
];

const paymentMethods = [
  "Cash",
  "Bank Transfer",
  "Mobile Money",
  "Cheque",
  "Card Payment"
];

const outstandingAmount = (amountDue: number, amountPaid: number) =>
  Math.max(0, amountDue - amountPaid);

const getDaysOverdue = (dueDate?: string) => {
  if (!dueDate) return 0;
  const today = new Date();
  const due = parseISO(dueDate);
  return isAfter(today, due) ? differenceInDays(today, due) : 0;
};

const getPaymentStatus = (fee: any) => {
  const outstanding = outstandingAmount(fee.amountDue, fee.amountPaid);
  if (outstanding === 0) return { status: 'paid', color: 'bg-green-100 text-green-800' };
  
  const daysOverdue = getDaysOverdue(fee.dueDate);
  if (daysOverdue > 30) return { status: 'severely overdue', color: 'bg-red-100 text-red-800' };
  if (daysOverdue > 0) return { status: 'overdue', color: 'bg-orange-100 text-orange-800' };
  
  return { status: 'pending', color: 'bg-yellow-100 text-yellow-800' };
};

function FeesPage() {
  const { fees, pupils, addFee, updateFee, refreshData, lastSyncTime, loading } = useStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedTerm, setSelectedTerm] = useState("all");
  const [open, setOpen] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [payment, setPayment] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [form, setForm] = useState(emptyForm);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasUserActivity, setHasUserActivity] = useState(true);

  // Enhanced analytics
  const feeAnalytics = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    const currentYearFees = fees.filter(fee => fee.year === currentYear);
    
    const totalDue = currentYearFees.reduce((sum, fee) => sum + fee.amountDue, 0);
    const totalPaid = currentYearFees.reduce((sum, fee) => sum + fee.amountPaid, 0);
    const totalOutstanding = currentYearFees.reduce(
      (sum, fee) => sum + outstandingAmount(fee.amountDue, fee.amountPaid),
      0,
    );

    const overdueFees = currentYearFees.filter(fee => {
      const outstanding = outstandingAmount(fee.amountDue, fee.amountPaid);
      return outstanding > 0 && getDaysOverdue(fee.dueDate) > 0;
    });

    const severelyOverdueFees = overdueFees.filter(fee => getDaysOverdue(fee.dueDate) > 30);
    
    // Fee categories breakdown
    const categoryBreakdown = feeCategories.map(category => {
      const categoryFees = currentYearFees.filter(fee => fee.description.toLowerCase().includes(category.toLowerCase()));
      const categoryTotal = categoryFees.reduce((sum, fee) => sum + fee.amountDue, 0);
      const categoryPaid = categoryFees.reduce((sum, fee) => sum + fee.amountPaid, 0);
      return {
        category,
        total: categoryTotal,
        paid: categoryPaid,
        outstanding: categoryTotal - categoryPaid,
        count: categoryFees.length
      };
    }).filter(item => item.count > 0);

    // Payment collection rate
    const collectionRate = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0;

    return {
      totalDue,
      totalPaid,
      totalOutstanding,
      overdueCount: overdueFees.length,
      severelyOverdueCount: severelyOverdueFees.length,
      collectionRate,
      categoryBreakdown,
      overdueFees,
      severelyOverdueFees
    };
  }, [fees]);

  // Export functionality
  const exportFeesData = () => {
    const exportData = visibleFees.map(fee => {
      const pupil = pupils.find(p => p.id === fee.pupilId);
      const outstanding = outstandingAmount(fee.amountDue, fee.amountPaid);
      const daysOverdue = getDaysOverdue(fee.dueDate);
      const { status } = getPaymentStatus(fee);
      
      return [
        pupil ? `${pupil.firstName} ${pupil.lastName}` : 'Unknown',
        pupil?.admissionNo || '-',
        fee.description,
        fee.term,
        fee.year,
        fee.amountDue.toFixed(2),
        fee.amountPaid.toFixed(2),
        outstanding.toFixed(2),
        fee.dueDate || '-',
        daysOverdue > 0 ? daysOverdue.toString() : '0',
        status,
        fee.notes || '-'
      ];
    });

    const csvContent = [
      ["Pupil Name", "Admission No", "Description", "Term", "Year", "Amount Due", "Amount Paid", "Outstanding", "Due Date", "Days Overdue", "Status", "Notes"],
      ...exportData
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `fees_report_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Fees data exported successfully");
  };

  // Track user activity to avoid unnecessary refreshes
  useEffect(() => {
    let activityTimer: NodeJS.Timeout;

    const resetActivityTimer = () => {
      setHasUserActivity(true);
      clearTimeout(activityTimer);
      activityTimer = setTimeout(() => setHasUserActivity(false), 60000); // 1 minute
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    events.forEach((event) => document.addEventListener(event, resetActivityTimer, true));

    // Set initial timer
    resetActivityTimer();

    return () => {
      events.forEach((event) => document.removeEventListener(event, resetActivityTimer, true));
      clearTimeout(activityTimer);
    };
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
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
        console.error("Auto-refresh failed:", error);
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
          console.error("Focus refresh failed:", error);
        }
      }
    };

    const handleOnlineRefresh = async () => {
      // Refresh immediately when coming back online
      try {
        await refreshData();
        toast.success("Reconnected - fees data refreshed");
      } catch (error) {
        console.error("Online refresh failed:", error);
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnlineRefresh);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnlineRefresh);
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
  const pupilNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of pupils) {
      map.set(p.id, `${p.firstName} ${p.lastName}`);
    }
    return map;
  }, [pupils]);

  const pupilName = useCallback(
    (id: string) => pupilNameMap.get(id) || "Unknown pupil",
    [pupilNameMap],
  );

  const visibleFees = useMemo(
    () =>
      fees.filter((fee) => {
        const name = pupilNameMap.get(fee.pupilId) || "Unknown pupil";
        const matchesQuery = `${name} ${fee.description}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const dueAmount = outstandingAmount(fee.amountDue, fee.amountPaid);
        const matchesStatus = 
          status === "all" || 
          (status === "paid" && dueAmount === 0) ||
          (status === "outstanding" && dueAmount > 0) ||
          (status === "overdue" && dueAmount > 0 && getDaysOverdue(fee.dueDate) > 0);
        const matchesTerm = selectedTerm === "all" || fee.term === selectedTerm;
        
        return matchesQuery && matchesStatus && matchesTerm;
      }),
    [fees, pupilNameMap, query, status, selectedTerm],
  );
  // Remove the old totals calculation since we now use feeAnalytics

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
    
    if (!fee || !Number.isFinite(amount) || amount <= 0 || amount > dueAmount) {
      return toast.error("Enter a valid payment within the outstanding balance");
    }
    
    try {
      await updateFee(fee.id, { 
        amountPaid: fee.amountPaid + amount,
        // In a real app, you'd track payment method and date
        notes: fee.notes 
          ? `${fee.notes} | Payment: ${amount.toFixed(2)} (${paymentMethod}) on ${format(new Date(), 'MMM d, yyyy')}`
          : `Payment: ${amount.toFixed(2)} (${paymentMethod}) on ${format(new Date(), 'MMM d, yyyy')}`
      });
      
      toast.success(`Payment of ${amount.toFixed(2)} recorded successfully`);
      setPaymentId(null);
      setPayment("");
      setPaymentMethod("Cash");

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

        {/* Enhanced Fee Analytics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Billed</p>
                <h3 className="text-2xl font-bold">{feeAnalytics.totalDue.toLocaleString()}</h3>
                <p className="text-xs text-muted-foreground">Current year</p>
              </div>
              <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-full">
                <Receipt className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Collected</p>
                <h3 className="text-2xl font-bold text-emerald-600">{feeAnalytics.totalPaid.toLocaleString()}</h3>
                <p className="text-xs text-muted-foreground">{feeAnalytics.collectionRate}% collection rate</p>
              </div>
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full">
                <DollarSign className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Outstanding</p>
                <h3 className="text-2xl font-bold text-amber-600">{feeAnalytics.totalOutstanding.toLocaleString()}</h3>
                <p className="text-xs text-muted-foreground">Pending collection</p>
              </div>
              <div className="p-2 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-full">
                <Clock className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <h3 className="text-2xl font-bold text-orange-600">{feeAnalytics.overdueCount}</h3>
                <p className="text-xs text-muted-foreground">Past due date</p>
              </div>
              <div className="p-2 bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 rounded-full">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Collection Rate</p>
                <h3 className={`text-2xl font-bold ${feeAnalytics.collectionRate >= 90 ? 'text-emerald-600' : feeAnalytics.collectionRate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                  {feeAnalytics.collectionRate}%
                </h3>
                <p className="text-xs text-muted-foreground">Payment efficiency</p>
              </div>
              <div className={`p-2 rounded-full ${feeAnalytics.collectionRate >= 90 ? 'bg-emerald-100 text-emerald-600' : feeAnalytics.collectionRate >= 70 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                <TrendingUp className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overdue Fees Alert */}
        {feeAnalytics.severelyOverdueCount > 0 && (
          <Card className="border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/10">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-red-800 dark:text-red-200">Severely Overdue Fees</h4>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {feeAnalytics.severelyOverdueCount} fee{feeAnalytics.severelyOverdueCount > 1 ? 's are' : ' is'} overdue by more than 30 days. Immediate action required.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" className="text-red-600 border-red-300">
                      Send Reminders
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 border-red-300">
                      Generate Report
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
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
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleManualRefresh}
                disabled={isRefreshing || loading || !isOnline}
                className={!isOnline ? "opacity-50 cursor-not-allowed" : ""}
              >
                <RefreshCw
                  className={`mr-1 h-4 w-4 ${isRefreshing || loading ? "animate-spin" : ""}`}
                />
                {isRefreshing ? "Refreshing..." : !isOnline ? "Offline" : "Refresh"}
              </Button>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={exportFeesData}>
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Export fees data to CSV</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-1" />
                    Reports
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => toast.info("Feature coming soon!")}>
                    <Receipt className="h-4 w-4 mr-2" />
                    Collection Summary
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.info("Feature coming soon!")}>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Overdue Report
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => toast.info("Feature coming soon!")}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Monthly Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
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
            </div>
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
                <SelectTrigger className="sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="outstanding">Outstanding</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All terms</SelectItem>
                  <SelectItem value="Term 1">Term 1</SelectItem>
                  <SelectItem value="Term 2">Term 2</SelectItem>
                  <SelectItem value="Term 3">Term 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="mb-4 text-sm text-muted-foreground">
              Showing {visibleFees.length} of {fees.length} fee records
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pupil</TableHead>
                  <TableHead>Charge</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Due amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleFees.map((fee) => {
                  const dueAmount = outstandingAmount(fee.amountDue, fee.amountPaid);
                  const daysOverdue = getDaysOverdue(fee.dueDate);
                  const { status: paymentStatus, color } = getPaymentStatus(fee);
                  
                  return (
                    <TableRow key={fee.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{pupilName(fee.pupilId)}</span>
                          {daysOverdue > 30 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertTriangle className="h-4 w-4 text-red-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Severely overdue: {daysOverdue} days</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{fee.description}</TableCell>
                      <TableCell>
                        {fee.term} {fee.year}
                      </TableCell>
                      <TableCell>{fee.amountDue.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{fee.amountPaid.toLocaleString()}</span>
                          {dueAmount > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {dueAmount.toLocaleString()} remaining
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {fee.dueDate ? (
                          <div className="flex flex-col">
                            <span>{format(parseISO(fee.dueDate), 'MMM d, yyyy')}</span>
                            {daysOverdue > 0 && (
                              <span className="text-xs text-red-600">
                                {daysOverdue} days overdue
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={color}>
                          {paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {dueAmount > 0 && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setPaymentId(fee.id)}
                            className={daysOverdue > 0 ? "border-orange-300 text-orange-700 hover:bg-orange-50" : ""}
                          >
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
                  <p className="text-sm text-muted-foreground">No fee records match this view.</p>
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
          <div className="space-y-4">
            {paymentId && (() => {
              const fee = fees.find(f => f.id === paymentId);
              const outstanding = fee ? outstandingAmount(fee.amountDue, fee.amountPaid) : 0;
              return fee ? (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm">
                    <p><strong>Pupil:</strong> {pupilName(fee.pupilId)}</p>
                    <p><strong>Fee:</strong> {fee.description} ({fee.term} {fee.year})</p>
                    <p><strong>Outstanding:</strong> {outstanding.toLocaleString()}</p>
                  </div>
                </div>
              ) : null;
            })()}
            
            <div>
              <Label>Payment amount</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={payment}
                onChange={(event) => setPayment(event.target.value)}
                placeholder="Enter payment amount"
              />
            </div>
            
            <div>
              <Label>Payment method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentId(null)}>
              Cancel
            </Button>
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
