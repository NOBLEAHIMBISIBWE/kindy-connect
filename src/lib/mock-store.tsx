import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Role = "admin" | "deputy" | "teacher";
export type TeacherStatus = "pending" | "verified" | "rejected";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: TeacherStatus;
  phone?: string;
  classId?: string;
  registeredAt: string;
  password?: string;
}

export interface Pupil {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  gender: "M" | "F";
  dob: string;
  classId: string;
  photo?: string;
  active: boolean;
  parentIds: string[];
}

export interface Parent {
  id: string;
  name: string;
  phone: string;
  email: string;
  relationship: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  teacherId?: string;
}

export interface Attendance {
  id: string;
  pupilId: string;
  date: string; // yyyy-mm-dd
  arrival?: string;
  departure?: string;
  arrivalTransport?: string; // e.g., "Car", "Bus", "Walking", "Bicycle", "Motorcycle"
  arrivalVehicleReg?: string;
  arrivalPersonName?: string;
  arrivalPersonRelation?: string; // e.g., "Mother", "Father", "Guardian", "Driver"
  arrivalPhone?: string;
  departureTransport?: string;
  departureVehicleReg?: string;
  departurePersonName?: string;
  departurePersonRelation?: string;
  departurePhone?: string;
}

export interface Notification {
  id: string;
  pupilId: string;
  parentId: string;
  channel: "sms" | "email";
  type: "arrival" | "departure";
  status: "sent" | "failed";
  message: string;
  timestamp: string;
  phoneNumber?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  target: string;
  timestamp: string;
}

export interface Mark {
  id: string;
  pupilId: string;
  subject: string;
  term: string; // e.g., "Term 1", "Term 2", "Term 3"
  year: string; // e.g., "2025"
  score: number;
  maxScore: number;
  grade?: string;
  teacherComment?: string;
  recordedBy: string;
  recordedAt: string;
}

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const time = () => new Date().toTimeString().slice(0, 5);
const uid = () => Math.random().toString(36).slice(2, 10);

// Calculate grade based on score percentage
function calculateGrade(score: number, maxScore: number): string {
  if (maxScore === 0) return "N/A";
  const percentage = (score / maxScore) * 100;
  if (percentage >= 90) return "A";
  if (percentage >= 80) return "B";
  if (percentage >= 70) return "C";
  if (percentage >= 60) return "D";
  return "E";
}

// ---------- Seed data ----------
const seedClasses: ClassRoom[] = [
  { id: "c1", name: "Sunflower", teacherId: "u3" },
  { id: "c2", name: "Butterfly", teacherId: "u4" },
  { id: "c3", name: "Rainbow" },
];

const seedUsers: User[] = [
  { id: "u1", name: "Amina Okello", email: "admin@kinder.app", role: "admin", status: "verified", phone: "+254700000001", password: "admin123", registeredAt: "2025-01-10" },
  { id: "u2", name: "Brian Mwangi", email: "deputy@kinder.app", role: "deputy", status: "verified", phone: "+254700000002", password: "deputy123", registeredAt: "2025-01-12" },
  { id: "u3", name: "Grace Wanjiku", email: "grace@kinder.app", role: "teacher", status: "verified", phone: "+254700000003", classId: "c1", password: "grace123", registeredAt: "2025-02-01" },
  { id: "u4", name: "Peter Otieno", email: "peter@kinder.app", role: "teacher", status: "verified", phone: "+254700000004", classId: "c2", password: "peter123", registeredAt: "2025-02-03" },
  { id: "u5", name: "Lucy Achieng", email: "lucy@kinder.app", role: "teacher", status: "pending", phone: "+254700000005", password: "lucy123", registeredAt: "2025-06-15" },
  { id: "u6", name: "James Kariuki", email: "james@kinder.app", role: "teacher", status: "pending", phone: "+254700000006", password: "james123", registeredAt: "2025-06-16" },
];

const seedParents: Parent[] = [
  { id: "p1", name: "Mary Atieno", phone: "+254712000001", email: "mary@example.com", relationship: "Mother" },
  { id: "p2", name: "John Kamau", phone: "+254712000002", email: "john@example.com", relationship: "Father" },
  { id: "p3", name: "Sarah Njeri", phone: "+254712000003", email: "sarah@example.com", relationship: "Mother" },
  { id: "p4", name: "David Mutua", phone: "+254712000004", email: "david@example.com", relationship: "Father" },
  { id: "p5", name: "Esther Wambui", phone: "+254712000005", email: "esther@example.com", relationship: "Guardian" },
];

const seedPupils: Pupil[] = [
  { id: "k1", admissionNo: "KG-001", firstName: "Liam", lastName: "Atieno", gender: "M", dob: "2020-05-12", classId: "c1", active: true, parentIds: ["p1"] },
  { id: "k2", admissionNo: "KG-002", firstName: "Zuri", lastName: "Kamau", gender: "F", dob: "2020-08-22", classId: "c1", active: true, parentIds: ["p2"] },
  { id: "k3", admissionNo: "KG-003", firstName: "Noah", lastName: "Njeri", gender: "M", dob: "2019-11-03", classId: "c2", active: true, parentIds: ["p3"] },
  { id: "k4", admissionNo: "KG-004", firstName: "Ava", lastName: "Mutua", gender: "F", dob: "2020-02-19", classId: "c2", active: true, parentIds: ["p4"] },
  { id: "k5", admissionNo: "KG-005", firstName: "Eli", lastName: "Wambui", gender: "M", dob: "2019-09-30", classId: "c3", active: true, parentIds: ["p5"] },
  { id: "k6", admissionNo: "KG-006", firstName: "Maya", lastName: "Atieno", gender: "F", dob: "2020-07-14", classId: "c1", active: true, parentIds: ["p1"] },
];

function seedAttendance(): Attendance[] {
  return [
    { id: "a1", pupilId: "k1", date: today(), arrival: "07:55", arrivalTransport: "Car", arrivalVehicleReg: "KAA 123B", arrivalPersonName: "Mary Atieno", arrivalPersonRelation: "Mother", arrivalPhone: "+254712000001" },
    { id: "a2", pupilId: "k2", date: today(), arrival: "08:02", arrivalTransport: "School Bus", arrivalVehicleReg: "KBZ 456C", arrivalPersonName: "John Kariuki", arrivalPersonRelation: "Driver", arrivalPhone: "+254700000004" },
    { id: "a3", pupilId: "k3", date: today(), arrival: "07:48", departure: "16:30", arrivalTransport: "Motorcycle", arrivalVehicleReg: "KMCA 789D", arrivalPersonName: "David Mutua", arrivalPersonRelation: "Father", arrivalPhone: "+254712000004", departureTransport: "Car", departureVehicleReg: "KAB 321E", departurePersonName: "Sarah Njeri", departurePersonRelation: "Mother", departurePhone: "+254712000003" },
  ];
}

function seedNotifications(): Notification[] {
  return [
    { id: "n1", pupilId: "k1", parentId: "p1", channel: "sms", type: "arrival", status: "sent", message: "Liam arrived at 07:55", timestamp: now(), phoneNumber: "+254712000001" },
    { id: "n2", pupilId: "k1", parentId: "p1", channel: "email", type: "arrival", status: "sent", message: "Liam arrived at 07:55", timestamp: now(), phoneNumber: "+254712000001" },
    { id: "n3", pupilId: "k2", parentId: "p2", channel: "sms", type: "arrival", status: "sent", message: "Zuri arrived at 08:02", timestamp: now(), phoneNumber: "+254712000002" },
    { id: "n4", pupilId: "k3", parentId: "p3", channel: "sms", type: "departure", status: "failed", message: "Departure SMS failed", timestamp: now(), phoneNumber: "+254712000003" },
  ];
}

function seedAudit(): AuditLog[] {
  return [
    { id: "l1", actorId: "u1", actorName: "Amina Okello", action: "Created pupil", target: "Liam Atieno (KG-001)", timestamp: now() },
    { id: "l2", actorId: "u2", actorName: "Brian Mwangi", action: "Approved teacher", target: "Grace Wanjiku", timestamp: now() },
    { id: "l3", actorId: "u3", actorName: "Grace Wanjiku", action: "Marked arrival", target: "Liam Atieno", timestamp: now() },
  ];
}

function seedMarks(): Mark[] {
  return [
    { id: "m1", pupilId: "k1", subject: "Reading", term: "Term 1", year: "2025", score: 85, maxScore: 100, grade: "A", teacherComment: "Excellent progress!", recordedBy: "u3", recordedAt: "2025-03-15T10:30:00Z" },
    { id: "m2", pupilId: "k1", subject: "Math", term: "Term 1", year: "2025", score: 78, maxScore: 100, grade: "B", teacherComment: "Good work", recordedBy: "u3", recordedAt: "2025-03-15T10:35:00Z" },
    { id: "m3", pupilId: "k2", subject: "Reading", term: "Term 1", year: "2025", score: 92, maxScore: 100, grade: "A", teacherComment: "Outstanding!", recordedBy: "u3", recordedAt: "2025-03-15T10:40:00Z" },
  ];
}

// ---------- Store ----------
interface Store {
  currentUser: User | null;
  users: User[];
  pupils: Pupil[];
  parents: Parent[];
  classes: ClassRoom[];
  attendance: Attendance[];
  notifications: Notification[];
  audit: AuditLog[];
  marks: Mark[];
  login: (email: string, password?: string) => User | null;
  loginAs: (role: Role) => void;
  logout: () => void;
  registerUser: (data: { name: string; email: string; phone: string; password?: string; role: Role }) => void;
  approveTeacher: (id: string) => void;
  rejectTeacher: (id: string) => void;
  addPupil: (data: Omit<Pupil, "id" | "active">) => void;
  updatePupil: (id: string, data: Partial<Pupil>) => void;
  deactivatePupil: (id: string) => void;
  addParent: (data: Omit<Parent, "id">) => void;
  markArrival: (pupilId: string, transportDetails?: { transport: string; vehicleReg?: string; personName: string; personRelation: string; phone?: string }) => void;
  markDeparture: (pupilId: string, transportDetails?: { transport: string; vehicleReg?: string; personName: string; personRelation: string; phone?: string }) => void;
  addMark: (data: Omit<Mark, "id" | "recordedBy" | "recordedAt">) => void;
  updateMark: (id: string, data: Partial<Omit<Mark, "id" | "recordedBy" | "recordedAt">>) => void;
  deleteMark: (id: string) => void;
}

const Ctx = createContext<Store | null>(null);

const KEY = "kinder.store.v1";

function loadInitial() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function MockStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => {
    const persisted = loadInitial();
    if (persisted) {
      // Clean up old attendance records on load (keep only today and historical)
      const currentDate = today();
      const cleanedAttendance = persisted.attendance.filter((a: Attendance) => {
        // Keep records from today or older (for historical purposes)
        return a.date <= currentDate;
      });
      return { ...persisted, attendance: cleanedAttendance };
    }
    return {
      currentUserId: null as string | null,
      users: seedUsers,
      pupils: seedPupils,
      parents: seedParents,
      classes: seedClasses,
      attendance: seedAttendance(),
      notifications: seedNotifications(),
      audit: seedAudit(),
      marks: seedMarks(),
    };
  });

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }, [state]);

  // Reset attendance at midnight
  useEffect(() => {
    const checkMidnight = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const msUntilMidnight = tomorrow.getTime() - now.getTime();
      
      const timer = setTimeout(() => {
        // At midnight, clear today's attendance records
        setState((s: any) => {
          const currentDate = today();
          return {
            ...s,
            attendance: s.attendance.filter((a: Attendance) => a.date < currentDate)
          };
        });
        
        // Check again for next midnight
        checkMidnight();
      }, msUntilMidnight);
      
      return timer;
    };
    
    const timer = checkMidnight();
    return () => clearTimeout(timer);
  }, []);

  const currentUser = useMemo(
    () => state.users.find((u: User) => u.id === state.currentUserId) ?? null,
    [state]
  );

  const logAction = (actor: User | null, action: string, target: string) => {
    if (!actor) return;
    setState((s: any) => ({
      ...s,
      audit: [{ id: uid(), actorId: actor.id, actorName: actor.name, action, target, timestamp: now() }, ...s.audit],
    }));
  };

  const sendNotifications = (pupil: Pupil, type: "arrival" | "departure", t: string) => {
    const parents = state.parents.filter((p: Parent) => pupil.parentIds.includes(p.id));
    const newNotifs: Notification[] = [];
    for (const p of parents) {
      const msg =
        type === "arrival"
          ? `Dear ${p.name}, your child ${pupil.firstName} ${pupil.lastName} has arrived safely at school today at ${t}.`
          : `Dear ${p.name}, your child ${pupil.firstName} ${pupil.lastName} has left school today at ${t}.`;
      
      // Send SMS notification
      newNotifs.push({ 
        id: uid(), 
        pupilId: pupil.id, 
        parentId: p.id, 
        channel: "sms", 
        type, 
        status: "sent", 
        message: msg, 
        timestamp: now(),
        phoneNumber: p.phone,
      });
      
      // Send Email notification
      newNotifs.push({ 
        id: uid(), 
        pupilId: pupil.id, 
        parentId: p.id, 
        channel: "email", 
        type, 
        status: "sent", 
        message: msg, 
        timestamp: now(),
        phoneNumber: p.phone,
      });
    }
    setState((s: any) => ({ ...s, notifications: [...newNotifs, ...s.notifications] }));
  };

  const store: Store = {
    currentUser,
    users: state.users,
    pupils: state.pupils,
    parents: state.parents,
    classes: state.classes,
    attendance: state.attendance,
    notifications: state.notifications,
    audit: state.audit,
    marks: state.marks || [],
    login: (email, password) => {
      const u = state.users.find((x: User) => x.email.toLowerCase() === email.toLowerCase());
      if (!u) return null;
      if (password && u.password && u.password !== password) return null;
      if (u.role === "teacher" && u.status !== "verified") return null;
      setState((s: any) => ({ ...s, currentUserId: u.id }));
      return u;
    },
    loginAs: (role) => {
      const u = state.users.find((x: User) => x.role === role && x.status === "verified");
      if (u) setState((s: any) => ({ ...s, currentUserId: u.id }));
    },
    logout: () => setState((s: any) => ({ ...s, currentUserId: null })),
    registerUser: ({ name, email, phone, password, role }) => {
      const u: User = {
        id: uid(),
        name,
        email,
        phone,
        role,
        password: password || "12345678",
        status: role === "admin" ? "verified" : "pending",
        registeredAt: today(),
      };
      setState((s: any) => ({ ...s, users: [...s.users, u] }));
    },
    approveTeacher: (id) => {
      setState((s: any) => ({ ...s, users: s.users.map((u: User) => (u.id === id ? { ...u, status: "verified" } : u)) }));
      const t = state.users.find((u: User) => u.id === id);
      if (t) logAction(currentUser, "Approved teacher", t.name);
    },
    rejectTeacher: (id) => {
      setState((s: any) => ({ ...s, users: s.users.map((u: User) => (u.id === id ? { ...u, status: "rejected" } : u)) }));
      const t = state.users.find((u: User) => u.id === id);
      if (t) logAction(currentUser, "Rejected teacher", t.name);
    },
    addPupil: (data) => {
      const p: Pupil = { ...data, id: uid(), active: true };
      setState((s: any) => ({ ...s, pupils: [...s.pupils, p] }));
      logAction(currentUser, "Registered pupil", `${p.firstName} ${p.lastName} (${p.admissionNo})`);
    },
    updatePupil: (id, data) => {
      setState((s: any) => ({ ...s, pupils: s.pupils.map((p: Pupil) => (p.id === id ? { ...p, ...data } : p)) }));
    },
    deactivatePupil: (id) => {
      setState((s: any) => ({ ...s, pupils: s.pupils.map((p: Pupil) => (p.id === id ? { ...p, active: false } : p)) }));
    },
    addParent: (data) => {
      const p: Parent = { ...data, id: uid() };
      setState((s: any) => ({ ...s, parents: [...s.parents, p] }));
      logAction(currentUser, "Registered parent", p.name);
    },
    markArrival: (pupilId, transportDetails) => {
      const t = time();
      const d = today();
      const existing = state.attendance.find((a: Attendance) => a.pupilId === pupilId && a.date === d);
      if (existing && existing.arrival) return;
      if (existing) {
        setState((s: any) => ({ 
          ...s, 
          attendance: s.attendance.map((a: Attendance) => 
            a.id === existing.id 
              ? { 
                  ...a, 
                  arrival: t,
                  arrivalTransport: transportDetails?.transport,
                  arrivalVehicleReg: transportDetails?.vehicleReg,
                  arrivalPersonName: transportDetails?.personName,
                  arrivalPersonRelation: transportDetails?.personRelation,
                  arrivalPhone: transportDetails?.phone,
                } 
              : a
          ) 
        }));
      } else {
        const rec: Attendance = { 
          id: uid(), 
          pupilId, 
          date: d, 
          arrival: t,
          arrivalTransport: transportDetails?.transport,
          arrivalVehicleReg: transportDetails?.vehicleReg,
          arrivalPersonName: transportDetails?.personName,
          arrivalPersonRelation: transportDetails?.personRelation,
          arrivalPhone: transportDetails?.phone,
        };
        setState((s: any) => ({ ...s, attendance: [...s.attendance, rec] }));
      }
      const pupil = state.pupils.find((p: Pupil) => p.id === pupilId);
      if (pupil) {
        sendNotifications(pupil, "arrival", t);
        logAction(currentUser, "Marked arrival", `${pupil.firstName} ${pupil.lastName}`);
      }
    },
    markDeparture: (pupilId, transportDetails) => {
      const t = time();
      const d = today();
      const existing = state.attendance.find((a: Attendance) => a.pupilId === pupilId && a.date === d);
      if (existing && existing.departure) return;
      if (existing) {
        setState((s: any) => ({ 
          ...s, 
          attendance: s.attendance.map((a: Attendance) => 
            a.id === existing.id 
              ? { 
                  ...a, 
                  departure: t,
                  departureTransport: transportDetails?.transport,
                  departureVehicleReg: transportDetails?.vehicleReg,
                  departurePersonName: transportDetails?.personName,
                  departurePersonRelation: transportDetails?.personRelation,
                  departurePhone: transportDetails?.phone,
                } 
              : a
          ) 
        }));
      } else {
        const rec: Attendance = { 
          id: uid(), 
          pupilId, 
          date: d, 
          departure: t,
          departureTransport: transportDetails?.transport,
          departureVehicleReg: transportDetails?.vehicleReg,
          departurePersonName: transportDetails?.personName,
          departurePersonRelation: transportDetails?.personRelation,
          departurePhone: transportDetails?.phone,
        };
        setState((s: any) => ({ ...s, attendance: [...s.attendance, rec] }));
      }
      const pupil = state.pupils.find((p: Pupil) => p.id === pupilId);
      if (pupil) {
        sendNotifications(pupil, "departure", t);
        logAction(currentUser, "Marked departure", `${pupil.firstName} ${pupil.lastName}`);
      }
    },
    addMark: (data) => {
      if (!currentUser) return;
      const mark: Mark = {
        ...data,
        id: uid(),
        recordedBy: currentUser.id,
        recordedAt: now(),
        grade: data.grade || calculateGrade(data.score, data.maxScore),
      };
      setState((s: any) => ({ ...s, marks: [...s.marks, mark] }));
      const pupil = state.pupils.find((p: Pupil) => p.id === data.pupilId);
      if (pupil) {
        logAction(currentUser, "Added mark", `${pupil.firstName} ${pupil.lastName} - ${data.subject} (${data.score}/${data.maxScore})`);
      }
    },
    updateMark: (id, data) => {
      setState((s: any) => ({
        ...s,
        marks: s.marks.map((m: Mark) =>
          m.id === id
            ? { ...m, ...data, grade: data.grade || (data.score !== undefined && data.maxScore !== undefined ? calculateGrade(data.score, data.maxScore) : m.grade) }
            : m
        ),
      }));
      const mark = state.marks.find((m: Mark) => m.id === id);
      const pupil = mark ? state.pupils.find((p: Pupil) => p.id === mark.pupilId) : null;
      if (pupil) {
        logAction(currentUser, "Updated mark", `${pupil.firstName} ${pupil.lastName} - ${mark!.subject}`);
      }
    },
    deleteMark: (id) => {
      const mark = state.marks.find((m: Mark) => m.id === id);
      const pupil = mark ? state.pupils.find((p: Pupil) => p.id === mark.pupilId) : null;
      setState((s: any) => ({ ...s, marks: s.marks.filter((m: Mark) => m.id !== id) }));
      if (pupil && mark) {
        logAction(currentUser, "Deleted mark", `${pupil.firstName} ${pupil.lastName} - ${mark.subject}`);
      }
    },
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within MockStoreProvider");
  return ctx;
}