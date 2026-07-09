import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { Car, Info, Calendar } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

  const classPupils = pupils.filter((p) => p.classId === classId && p.active);
  const dayAtt = attendance.filter((a) => a.date === date);

  const transportModes = ["Car", "School Bus", "Motorcycle", "Walking", "Bicycle", "Van", "Taxi"];
  const relations = ["Mother", "Father", "Guardian", "Driver", "Uncle", "Aunt", "Grandparent", "Sibling"];

  const handleArrival = async () => {
    if (!selectedPupil || !arrivalForm.transport || !arrivalForm.personName || !arrivalForm.personRelation || !arrivalForm.phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    await markArrival(selectedPupil.id, {
      transport: arrivalForm.transport,
      vehicleReg: arrivalForm.vehicleReg,
      personName: arrivalForm.personName,
      personRelation: arrivalForm.personRelation,
      phone: arrivalForm.phone,
    });

    toast.success(`Arrival logged - parents notified`);
    setArrivalDialogOpen(false);
    setSelectedPupil(null);
    setArrivalForm({ transport: "", vehicleReg: "", personName: "", personRelation: "", phone: "" });
  };

  const handleDeparture = async () => {
    if (!selectedPupil || !departureForm.transport || !departureForm.personName || !departureForm.personRelation || !departureForm.phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    await markDeparture(selectedPupil.id, {
      transport: departureForm.transport,
      vehicleReg: departureForm.vehicleReg,
      personName: departureForm.personName,
      personRelation: departureForm.personRelation,
      phone: departureForm.phone,
    });

    toast.success(`Departure logged - parents notified`);
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

  return (
    <AppShell title="Attendance">
      <Card className="border-0 shadow-sm"><CardContent className="p-5">
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <Select value={classId} onValueChange={setClassId} disabled={isTeacher}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <label htmlFor="date-search" className="text-sm font-medium">Search Date:</label>
            <input 
              id="date-search"
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {date !== today && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDate(today);
                  toast.success("Reset to today's date");
                }}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Reset to Today
              </Button>
            )}
          </div>
        </div>

        <Table>
          <TableHeader><TableRow><TableHead>Pupil</TableHead><TableHead>Arrival</TableHead><TableHead>Transport In</TableHead><TableHead>Departure</TableHead><TableHead>Transport Out</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {classPupils.map((p) => {
              const att = dayAtt.find((a) => a.pupilId === p.id);
              const isToday = date === today;
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.firstName} {p.lastName}</TableCell>
                  <TableCell>{att?.arrival ?? "-"}</TableCell>
                  <TableCell>
                    {att?.arrivalTransport ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 cursor-help">
                              <Car className="h-3 w-3" />
                              <span className="text-sm">{att.arrivalTransport}</span>
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-1 text-sm">
                              <p><strong>Transport:</strong> {att.arrivalTransport}</p>
                              {att.arrivalVehicleReg && <p><strong>Vehicle:</strong> {att.arrivalVehicleReg}</p>}
                              <p><strong>Brought by:</strong> {att.arrivalPersonName} ({att.arrivalPersonRelation})</p>
                              {att.arrivalPhone && <p><strong>Phone:</strong> {att.arrivalPhone}</p>}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : "-"}
                  </TableCell>
                  <TableCell>{att?.departure ?? "-"}</TableCell>
                  <TableCell>
                    {att?.departureTransport ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 cursor-help">
                              <Car className="h-3 w-3" />
                              <span className="text-sm">{att.departureTransport}</span>
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-1 text-sm">
                              <p><strong>Transport:</strong> {att.departureTransport}</p>
                              {att.departureVehicleReg && <p><strong>Vehicle:</strong> {att.departureVehicleReg}</p>}
                              <p><strong>Picked by:</strong> {att.departurePersonName} ({att.departurePersonRelation})</p>
                              {att.departurePhone && <p><strong>Phone:</strong> {att.departurePhone}</p>}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    {att?.arrival ? <Badge>Present</Badge> : <Badge variant="secondary">Absent</Badge>}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" disabled={!isToday || !!att?.arrival} onClick={() => openArrivalDialog(p)}>Arrival</Button>
                    <Button size="sm" variant="secondary" disabled={!isToday || !att?.arrival || !!att?.departure} onClick={() => openDepartureDialog(p)}>Departure</Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {classPupils.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No pupils in this class.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

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