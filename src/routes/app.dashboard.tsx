import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useStore } from "@/lib/mock-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Baby, GraduationCap, CalendarCheck, BellRing, Sun, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard - Little Stars" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { currentUser, pupils, classes, users, attendance, notifications, markArrival, markDeparture, parents } = useStore();
  if (!currentUser) return null;

  const [arrivalDialogOpen, setArrivalDialogOpen] = useState(false);
  const [departureDialogOpen, setDepartureDialogOpen] = useState(false);
  const [selectedPupil, setSelectedPupil] = useState<any>(null);
  const [arrivalForm, setArrivalForm] = useState({
    transport: "",
    vehicleReg: "",
    personName: "",
    personRelation: "",
    phone: "",
  });
  const [departureForm, setDepartureForm] = useState({
    transport: "",
    vehicleReg: "",
    personName: "",
    personRelation: "",
    phone: "",
  });

  const transportModes = ["Car", "School Bus", "Motorcycle", "Walking", "Bicycle", "Van", "Taxi"];
  const relations = ["Mother", "Father", "Guardian", "Driver", "Uncle", "Aunt", "Grandparent", "Sibling"];

  const handleArrival = () => {
    if (!selectedPupil || !arrivalForm.transport || !arrivalForm.personName || !arrivalForm.personRelation || !arrivalForm.phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    markArrival(selectedPupil.id, {
      transport: arrivalForm.transport,
      vehicleReg: arrivalForm.vehicleReg,
      personName: arrivalForm.personName,
      personRelation: arrivalForm.personRelation,
      phone: arrivalForm.phone,
    });

    toast.success(`Arrival logged for ${selectedPupil.firstName} ${selectedPupil.lastName}`);
    setArrivalDialogOpen(false);
    setSelectedPupil(null);
    setArrivalForm({ transport: "", vehicleReg: "", personName: "", personRelation: "", phone: "" });
  };

  const handleDeparture = () => {
    if (!selectedPupil || !departureForm.transport || !departureForm.personName || !departureForm.personRelation || !departureForm.phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    markDeparture(selectedPupil.id, {
      transport: departureForm.transport,
      vehicleReg: departureForm.vehicleReg,
      personName: departureForm.personName,
      personRelation: departureForm.personRelation,
      phone: departureForm.phone,
    });

    toast.success(`Departure logged for ${selectedPupil.firstName} ${selectedPupil.lastName}`);
    setDepartureDialogOpen(false);
    setSelectedPupil(null);
    setDepartureForm({ transport: "", vehicleReg: "", personName: "", personRelation: "", phone: "" });
  };

  const openArrivalDialog = (pupil: any) => {
    setSelectedPupil(pupil);
    setArrivalDialogOpen(true);
  };

  const openDepartureDialog = (pupil: any) => {
    setSelectedPupil(pupil);
    setDepartureDialogOpen(true);
  };
  const isStaff = currentUser.role !== "teacher";
  const today = new Date().toISOString().slice(0, 10);
  const todayAtt = attendance.filter((a) => a.date === today);
  const presentIds = new Set(todayAtt.filter((a) => a.arrival).map((a) => a.pupilId));
  const pending = users.filter((u) => u.role === "teacher" && u.status === "pending").length;

  const stats = isStaff
    ? [
        { label: "Total pupils", value: pupils.filter((p) => p.active).length, icon: Baby, color: "bg-primary/15 text-primary" },
        { label: "Classes", value: classes.length, icon: Sun, color: "bg-secondary/20 text-secondary-foreground" },
        { label: "Present today", value: presentIds.size, icon: CalendarCheck, color: "bg-chart-4/20 text-chart-4" },
        { label: "Absent today", value: pupils.filter((p) => p.active).length - presentIds.size, icon: GraduationCap, color: "bg-accent/15 text-accent" },
      ]
    : [];

  const myClassPupils = pupils.filter((p) => p.classId === currentUser.classId && p.active);

  return (
    <AppShell title={`Hello, ${currentUser.name.split(" ")[0]}`}>
      {isStaff ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.label} className="border-0 shadow-sm">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${s.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-3xl font-semibold">{s.value}</div>
                      <div className="text-sm text-muted-foreground">{s.label}</div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {pending > 0 && (
            <Card className="mt-6 border-accent/40 bg-accent/5">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BellRing className="h-5 w-5 text-accent" />
                  <div>
                    <div className="font-semibold">{pending} teacher account{pending > 1 ? "s" : ""} awaiting approval</div>
                    <div className="text-sm text-muted-foreground">Review pending registrations.</div>
                  </div>
                </div>
                <Button asChild variant="default"><a href="/app/teachers">Review</a></Button>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 mt-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Recent attendance</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {todayAtt.slice(0, 6).map((a) => {
                  const p = pupils.find((x) => x.id === a.pupilId);
                  if (!p) return null;
                  return (
                    <div key={a.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                      <span className="font-medium">{p.firstName} {p.lastName}</span>
                      <span className="text-muted-foreground">
                        {a.arrival ? `Arrived ${a.arrival}` : ""} {a.departure ? `- Left ${a.departure}` : ""}
                      </span>
                    </div>
                  );
                })}
                {todayAtt.length === 0 && <p className="text-sm text-muted-foreground">No activity yet today.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Notification delivery</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {notifications.slice(0, 6).map((n) => {
                  const parent = parents.find((p) => p.id === n.parentId);
                  return (
                    <div key={n.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                      <div className="flex-1 min-w-0">
                        <span className="truncate block">{n.message}</span>
                        {n.phoneNumber && n.channel === "sms" && (
                          <span className="text-xs text-muted-foreground">To: {n.phoneNumber}</span>
                        )}
                        {n.channel === "email" && parent && (
                          <span className="text-xs text-muted-foreground">To: {parent.email}</span>
                        )}
                      </div>
                      <Badge variant={n.status === "sent" ? "default" : "destructive"} className="uppercase text-[10px] ml-2 shrink-0">{n.channel} - {n.status}</Badge>
                    </div>
                  );
                })}
                {notifications.length === 0 && <p className="text-sm text-muted-foreground">No notifications sent yet.</p>}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>My class: {classes.find((c) => c.id === currentUser.classId)?.name ?? "-"}</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.location.reload();
              }}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Page
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {myClassPupils.map((p) => {
                const att = todayAtt.find((a) => a.pupilId === p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border p-3">
                    <div>
                      <div className="font-medium">{p.firstName} {p.lastName}</div>
                      <div className="text-xs text-muted-foreground">
                        {att?.arrival ? `Arrived ${att.arrival}` : "Not arrived"}
                        {att?.departure ? ` - Left ${att.departure}` : ""}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" disabled={!!att?.arrival} onClick={() => openArrivalDialog(p)}>Arrival</Button>
                      <Button size="sm" variant="secondary" disabled={!att?.arrival || !!att?.departure} onClick={() => openDepartureDialog(p)}>Departure</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Arrival Dialog */}
      <Dialog open={arrivalDialogOpen} onOpenChange={setArrivalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Arrival - {selectedPupil?.firstName} {selectedPupil?.lastName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="arrival-transport">Mode of Transport *</Label>
              <Select value={arrivalForm.transport} onValueChange={(v) => setArrivalForm({ ...arrivalForm, transport: v })}>
                <SelectTrigger id="arrival-transport">
                  <SelectValue placeholder="Select transport mode" />
                </SelectTrigger>
                <SelectContent>
                  {transportModes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="arrival-vehicle">Vehicle Registration Number</Label>
              <div className="flex gap-2">
                <Input
                  id="arrival-vehicle"
                  value={arrivalForm.vehicleReg}
                  onChange={(e) => setArrivalForm({ ...arrivalForm, vehicleReg: e.target.value })}
                  placeholder="e.g., KAA 123B"
                  disabled={arrivalForm.vehicleReg === "N/A"}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant={arrivalForm.vehicleReg === "N/A" ? "default" : "outline"}
                  onClick={() => setArrivalForm({ ...arrivalForm, vehicleReg: arrivalForm.vehicleReg === "N/A" ? "" : "N/A" })}
                >
                  N/A
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Click N/A if no vehicle (e.g., walking)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="arrival-person">Operator Name / Person Bringing *</Label>
              <Input
                id="arrival-person"
                value={arrivalForm.personName}
                onChange={(e) => setArrivalForm({ ...arrivalForm, personName: e.target.value })}
                placeholder="e.g., Mary Atieno"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arrival-phone">Operator Phone Number *</Label>
              <Input
                id="arrival-phone"
                value={arrivalForm.phone}
                onChange={(e) => setArrivalForm({ ...arrivalForm, phone: e.target.value })}
                placeholder="e.g., +254 712 000 001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arrival-relation">Relationship *</Label>
              <Select value={arrivalForm.personRelation} onValueChange={(v) => setArrivalForm({ ...arrivalForm, personRelation: v })}>
                <SelectTrigger id="arrival-relation">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {relations.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArrivalDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleArrival}>Record Arrival</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Departure Dialog */}
      <Dialog open={departureDialogOpen} onOpenChange={setDepartureDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Departure - {selectedPupil?.firstName} {selectedPupil?.lastName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="departure-transport">Mode of Transport *</Label>
              <Select value={departureForm.transport} onValueChange={(v) => setDepartureForm({ ...departureForm, transport: v })}>
                <SelectTrigger id="departure-transport">
                  <SelectValue placeholder="Select transport mode" />
                </SelectTrigger>
                <SelectContent>
                  {transportModes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="departure-vehicle">Vehicle Registration Number</Label>
              <div className="flex gap-2">
                <Input
                  id="departure-vehicle"
                  value={departureForm.vehicleReg}
                  onChange={(e) => setDepartureForm({ ...departureForm, vehicleReg: e.target.value })}
                  placeholder="e.g., KBZ 456C"
                  disabled={departureForm.vehicleReg === "N/A"}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant={departureForm.vehicleReg === "N/A" ? "default" : "outline"}
                  onClick={() => setDepartureForm({ ...departureForm, vehicleReg: departureForm.vehicleReg === "N/A" ? "" : "N/A" })}
                >
                  N/A
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Click N/A if no vehicle (e.g., walking)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="departure-person">Operator Name / Person Picking Up *</Label>
              <Input
                id="departure-person"
                value={departureForm.personName}
                onChange={(e) => setDepartureForm({ ...departureForm, personName: e.target.value })}
                placeholder="e.g., John Kamau"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="departure-phone">Operator Phone Number *</Label>
              <Input
                id="departure-phone"
                value={departureForm.phone}
                onChange={(e) => setDepartureForm({ ...departureForm, phone: e.target.value })}
                placeholder="e.g., +254 712 000 002"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="departure-relation">Relationship *</Label>
              <Select value={departureForm.personRelation} onValueChange={(v) => setDepartureForm({ ...departureForm, personRelation: v })}>
                <SelectTrigger id="departure-relation">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {relations.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepartureDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeparture}>Record Departure</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}