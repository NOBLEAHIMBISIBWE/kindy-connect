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
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  target: string;
  timestamp: string;
}

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const time = () => new Date().toTimeString().slice(0, 5);
const uid = () => Math.random().toString(36).slice(2, 10);

// ---------- Seed data ----------
const seedClasses: ClassRoom[] = [
  { id: "c1", name: "Sunflower", teacherId: "u3" },
  { id: "c2", name: "Butterfly", teacherId: "u4" },
  { id: "c3", name: "Rainbow" },
];

const seedUsers: User[] = [
  { id: "u1", name: "Amina Okello", email: "admin@kinder.app", role: "admin", status: "verified", phone: "+254700000001", registeredAt: "2025-01-10" },
  { id: "u2", name: "Brian Mwangi", email: "deputy@kinder.app", role: "deputy", status: "verified", phone: "+254700000002", registeredAt: "2025-01-12" },
  { id: "u3", name: "Grace Wanjiku", email: "grace@kinder.app", role: "teacher", status: "verified", phone: "+254700000003", classId: "c1", registeredAt: "2025-02-01" },
  { id: "u4", name: "Peter Otieno", email: "peter@kinder.app", role: "teacher", status: "verified", phone: "+254700000004", classId: "c2", registeredAt: "2025-02-03" },
  { id: "u5", name: "Lucy Achieng", email: "lucy@kinder.app", role: "teacher", status: "pending", phone: "+254700000005", registeredAt: "2025-06-15" },
  { id: "u6", name: "James Kariuki", email: "james@kinder.app", role: "teacher", status: "pending", phone: "+254700000006", registeredAt: "2025-06-16" },
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
    { id: "a1", pupilId: "k1", date: today(), arrival: "07:55" },
    { id: "a2", pupilId: "k2", date: today(), arrival: "08:02" },
    { id: "a3", pupilId: "k3", date: today(), arrival: "07:48", departure: "16:30" },
  ];
}

function seedNotifications(): Notification[] {
  return [
    { id: "n1", pupilId: "k1", parentId: "p1", channel: "sms", type: "arrival", status: "sent", message: "Liam arrived at 07:55", timestamp: now() },
    { id: "n2", pupilId: "k1", parentId: "p1", channel: "email", type: "arrival", status: "sent", message: "Liam arrived at 07:55", timestamp: now() },
    { id: "n3", pupilId: "k2", parentId: "p2", channel: "sms", type: "arrival", status: "sent", message: "Zuri arrived at 08:02", timestamp: now() },
    { id: "n4", pupilId: "k3", parentId: "p3", channel: "sms", type: "departure", status: "failed", message: "Departure SMS failed", timestamp: now() },
  ];
}

function seedAudit(): AuditLog[] {
  return [
    { id: "l1", actorId: "u1", actorName: "Amina Okello", action: "Created pupil", target: "Liam Atieno (KG-001)", timestamp: now() },
    { id: "l2", actorId: "u2", actorName: "Brian Mwangi", action: "Approved teacher", target: "Grace Wanjiku", timestamp: now() },
    { id: "l3", actorId: "u3", actorName: "Grace Wanjiku", action: "Marked arrival", target: "Liam Atieno", timestamp: now() },
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
  login: (email: string) => User | null;
  loginAs: (role: Role) => void;
  logout: () => void;
  registerTeacher: (data: { name: string; email: string; phone: string }) => void;
  approveTeacher: (id: string) => void;
  rejectTeacher: (id: string) => void;
  addPupil: (data: Omit<Pupil, "id" | "active">) => void;
  updatePupil: (id: string, data: Partial<Pupil>) => void;
  deactivatePupil: (id: string) => void;
  addParent: (data: Omit<Parent, "id">) => void;
  markArrival: (pupilId: string) => void;
  markDeparture: (pupilId: string) => void;
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
    if (persisted) return persisted;
    return {
      currentUserId: null as string | null,
      users: seedUsers,
      pupils: seedPupils,
      parents: seedParents,
      classes: seedClasses,
      attendance: seedAttendance(),
      notifications: seedNotifications(),
      audit: seedAudit(),
    };
  });

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }, [state]);

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
      newNotifs.push({ id: uid(), pupilId: pupil.id, parentId: p.id, channel: "sms", type, status: "sent", message: msg, timestamp: now() });
      newNotifs.push({ id: uid(), pupilId: pupil.id, parentId: p.id, channel: "email", type, status: "sent", message: msg, timestamp: now() });
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
    login: (email) => {
      const u = state.users.find((x: User) => x.email.toLowerCase() === email.toLowerCase());
      if (!u) return null;
      if (u.role === "teacher" && u.status !== "verified") return null;
      setState((s: any) => ({ ...s, currentUserId: u.id }));
      return u;
    },
    loginAs: (role) => {
      const u = state.users.find((x: User) => x.role === role && x.status === "verified");
      if (u) setState((s: any) => ({ ...s, currentUserId: u.id }));
    },
    logout: () => setState((s: any) => ({ ...s, currentUserId: null })),
    registerTeacher: ({ name, email, phone }) => {
      const u: User = { id: uid(), name, email, phone, role: "teacher", status: "pending", registeredAt: today() };
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
    markArrival: (pupilId) => {
      const t = time();
      const d = today();
      const existing = state.attendance.find((a: Attendance) => a.pupilId === pupilId && a.date === d);
      if (existing && existing.arrival) return;
      if (existing) {
        setState((s: any) => ({ ...s, attendance: s.attendance.map((a: Attendance) => (a.id === existing.id ? { ...a, arrival: t } : a)) }));
      } else {
        const rec: Attendance = { id: uid(), pupilId, date: d, arrival: t };
        setState((s: any) => ({ ...s, attendance: [...s.attendance, rec] }));
      }
      const pupil = state.pupils.find((p: Pupil) => p.id === pupilId);
      if (pupil) {
        sendNotifications(pupil, "arrival", t);
        logAction(currentUser, "Marked arrival", `${pupil.firstName} ${pupil.lastName}`);
      }
    },
    markDeparture: (pupilId) => {
      const t = time();
      const d = today();
      const existing = state.attendance.find((a: Attendance) => a.pupilId === pupilId && a.date === d);
      if (existing && existing.departure) return;
      if (existing) {
        setState((s: any) => ({ ...s, attendance: s.attendance.map((a: Attendance) => (a.id === existing.id ? { ...a, departure: t } : a)) }));
      } else {
        const rec: Attendance = { id: uid(), pupilId, date: d, departure: t };
        setState((s: any) => ({ ...s, attendance: [...s.attendance, rec] }));
      }
      const pupil = state.pupils.find((p: Pupil) => p.id === pupilId);
      if (pupil) {
        sendNotifications(pupil, "departure", t);
        logAction(currentUser, "Marked departure", `${pupil.firstName} ${pupil.lastName}`);
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