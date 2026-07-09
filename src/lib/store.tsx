import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabase";
import type { Session } from "@supabase/supabase-js";

export type Role = "superadmin" | "admin" | "deputy" | "teacher";
export type TeacherStatus = "pending" | "verified" | "rejected";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: TeacherStatus;
  phone?: string;
  classId?: string;
  schoolId?: string;
  registeredAt: string;
  password?: string;
}

export interface School {
  id: string;
  name: string;
  location?: string;
  phone?: string;
  email?: string;
  createdAt: string;
  active: boolean;
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
  date: string;
  arrival?: string;
  departure?: string;
  arrivalTransport?: string;
  arrivalVehicleReg?: string;
  arrivalPersonName?: string;
  arrivalPersonRelation?: string;
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
  term: string;
  year: string;
  score: number;
  maxScore: number;
  grade?: string;
  teacherComment?: string;
  recordedBy: string;
  recordedAt: string;
}

interface Store {
  currentUser: User | null;
  users: User[];
  pupils: Pupil[];
  parents: Parent[];
  classes: ClassRoom[];
  schools: School[];
  attendance: Attendance[];
  notifications: Notification[];
  audit: AuditLog[];
  marks: Mark[];
  loading: boolean;
  login: (email: string, password?: string) => Promise<User | null>;
  loginAs: (role: Role) => void;
  logout: () => Promise<void>;
  registerUser: (data: { name: string; email: string; phone: string; password?: string; role: Role }) => Promise<void>;
  createSchool: (data: { name: string; location?: string; phone?: string; email?: string }) => Promise<School>;
  updateSchool: (id: string, data: Partial<Omit<School, "id" | "createdAt">>) => Promise<void>;
  deactivateSchool: (id: string) => Promise<void>;
  createSchoolAdmin: (schoolId: string, data: { name: string; email: string; phone: string; password: string }) => Promise<User | null>;
  assignAdminToSchool: (userId: string, schoolId: string) => Promise<void>;
  unassignAdmin: (userId: string) => Promise<void>;
  approveTeacher: (id: string) => Promise<void>;
  rejectTeacher: (id: string) => Promise<void>;
  addPupil: (data: Omit<Pupil, "id" | "active">) => Promise<void>;
  updatePupil: (id: string, data: Partial<Pupil>) => Promise<void>;
  deactivatePupil: (id: string) => Promise<void>;
  addParent: (data: Omit<Parent, "id">) => Promise<void>;
  markArrival: (pupilId: string, transportDetails?: { transport: string; vehicleReg?: string; personName: string; personRelation: string; phone?: string }) => Promise<void>;
  markDeparture: (pupilId: string, transportDetails?: { transport: string; vehicleReg?: string; personName: string; personRelation: string; phone?: string }) => Promise<void>;
  addMark: (data: Omit<Mark, "id" | "recordedBy" | "recordedAt">) => Promise<void>;
  updateMark: (id: string, data: Partial<Omit<Mark, "id" | "recordedBy" | "recordedAt">>) => Promise<void>;
  deleteMark: (id: string) => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const time = () => new Date().toTimeString().slice(0, 5);
const uid = () => Math.random().toString(36).slice(2, 10);

function calculateGrade(score: number, maxScore: number): string {
  if (maxScore === 0) return "N/A";
  const percentage = (score / maxScore) * 100;
  if (percentage >= 90) return "A";
  if (percentage >= 80) return "B";
  if (percentage >= 70) return "C";
  if (percentage >= 60) return "D";
  return "E";
}

// Map snake_case DB rows to camelCase app objects
function mapProfile(p: any): User {
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    role: p.role,
    status: p.status,
    phone: p.phone ?? undefined,
    classId: p.class_id ?? undefined,
    schoolId: p.school_id ?? undefined,
    registeredAt: p.registered_at ?? new Date().toISOString(),
  };
}

function mapSchool(s: any): School {
  return {
    id: s.id,
    name: s.name,
    location: s.location ?? undefined,
    phone: s.phone ?? undefined,
    email: s.email ?? undefined,
    createdAt: s.created_at ?? new Date().toISOString(),
    active: s.active,
  };
}

function mapPupil(p: any): Pupil {
  return {
    id: p.id,
    admissionNo: p.admission_no,
    firstName: p.first_name,
    lastName: p.last_name,
    gender: p.gender,
    dob: p.dob ?? "",
    classId: p.class_id ?? "",
    photo: p.photo ?? undefined,
    active: p.active,
    parentIds: p.parent_ids ?? [],
  };
}

function mapParent(p: any): Parent {
  return {
    id: p.id,
    name: p.name,
    phone: p.phone,
    email: p.email,
    relationship: p.relationship,
  };
}

function mapClass(c: any): ClassRoom {
  return {
    id: c.id,
    name: c.name,
    teacherId: c.teacher_id ?? undefined,
  };
}

function mapAttendance(a: any): Attendance {
  return {
    id: a.id,
    pupilId: a.pupil_id,
    date: a.date,
    arrival: a.arrival ?? undefined,
    departure: a.departure ?? undefined,
    arrivalTransport: a.arrival_transport ?? undefined,
    arrivalVehicleReg: a.arrival_vehicle_reg ?? undefined,
    arrivalPersonName: a.arrival_person_name ?? undefined,
    arrivalPersonRelation: a.arrival_person_relation ?? undefined,
    arrivalPhone: a.arrival_phone ?? undefined,
    departureTransport: a.departure_transport ?? undefined,
    departureVehicleReg: a.departure_vehicle_reg ?? undefined,
    departurePersonName: a.departure_person_name ?? undefined,
    departurePersonRelation: a.departure_person_relation ?? undefined,
    departurePhone: a.departure_phone ?? undefined,
  };
}

function mapNotification(n: any): Notification {
  return {
    id: n.id,
    pupilId: n.pupil_id,
    parentId: n.parent_id,
    channel: n.channel,
    type: n.type,
    status: n.status,
    message: n.message,
    timestamp: n.timestamp ?? now(),
    phoneNumber: n.phone_number ?? undefined,
  };
}

function mapAudit(a: any): AuditLog {
  return {
    id: a.id,
    actorId: a.actor_id ?? "",
    actorName: a.actor_name ?? "",
    action: a.action,
    target: a.target ?? "",
    timestamp: a.timestamp ?? now(),
  };
}

function mapMark(m: any): Mark {
  return {
    id: m.id,
    pupilId: m.pupil_id,
    subject: m.subject,
    term: m.term,
    year: m.year,
    score: Number(m.score),
    maxScore: Number(m.max_score),
    grade: m.grade ?? undefined,
    teacherComment: m.teacher_comment ?? undefined,
    recordedBy: m.recorded_by ?? "",
    recordedAt: m.recorded_at ?? now(),
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);

  // Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // Load profile when session changes
  useEffect(() => {
    if (!session?.user) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profile && profile.status === "verified") {
        setCurrentUser(mapProfile(profile));
      } else {
        // User not verified — sign them out
        await supabase.auth.signOut();
        setCurrentUser(null);
      }
      setLoading(false);
    })();
  }, [session]);

  // Load all data
  const loadAllData = async () => {
    const [pRes, prRes, cRes, sRes, aRes, nRes, auRes, mRes, uRes] = await Promise.all([
      supabase.from("pupils").select("*"),
      supabase.from("parents").select("*"),
      supabase.from("classes").select("*"),
      supabase.from("schools").select("*"),
      supabase.from("attendance").select("*"),
      supabase.from("notifications").select("*"),
      supabase.from("audit_log").select("*").order("timestamp", { ascending: false }),
      supabase.from("marks").select("*"),
      supabase.from("profiles").select("*"),
    ]);

    if (pRes.data) setPupils(pRes.data.map(mapPupil));
    if (prRes.data) setParents(prRes.data.map(mapParent));
    if (cRes.data) setClasses(cRes.data.map(mapClass));
    if (sRes.data) setSchools(sRes.data.map(mapSchool));
    if (aRes.data) setAttendance(aRes.data.map(mapAttendance));
    if (nRes.data) setNotifications(nRes.data.map(mapNotification));
    if (auRes.data) setAudit(auRes.data.map(mapAudit));
    if (mRes.data) setMarks(mRes.data.map(mapMark));
    if (uRes.data) setUsers(uRes.data.map(mapProfile));
  };

  useEffect(() => {
    if (currentUser) {
      loadAllData();
    }
  }, [currentUser?.id]);

  const logAction = async (actor: User | null, action: string, target: string) => {
    if (!actor) return;
    const entry = {
      id: uid(),
      actor_id: actor.id,
      actor_name: actor.name,
      action,
      target,
      timestamp: now(),
    };
    await supabase.from("audit_log").insert(entry);
    setAudit((prev) => [mapAudit(entry), ...prev]);
  };

  const sendNotifications = async (pupil: Pupil, type: "arrival" | "departure", t: string) => {
    const pupilParents = parents.filter((p) => pupil.parentIds.includes(p.id));
    const newNotifs: any[] = [];
    for (const p of pupilParents) {
      const msg =
        type === "arrival"
          ? `Dear ${p.name}, your child ${pupil.firstName} ${pupil.lastName} has arrived safely at school today at ${t}.`
          : `Dear ${p.name}, your child ${pupil.firstName} ${pupil.lastName} has left school today at ${t}.`;

      const smsNotif = {
        id: uid(),
        pupil_id: pupil.id,
        parent_id: p.id,
        channel: "sms",
        type,
        status: "sent",
        message: msg,
        timestamp: now(),
        phone_number: p.phone,
      };
      const emailNotif = {
        id: uid(),
        pupil_id: pupil.id,
        parent_id: p.id,
        channel: "email",
        type,
        status: "sent",
        message: msg,
        timestamp: now(),
        phone_number: p.phone,
      };
      newNotifs.push(smsNotif, emailNotif);
    }
    if (newNotifs.length > 0) {
      await supabase.from("notifications").insert(newNotifs);
      setNotifications((prev) => [...newNotifs.map(mapNotification), ...prev]);
    }
  };

  const store: Store = {
    currentUser,
    users,
    pupils,
    parents,
    classes,
    schools,
    attendance,
    notifications,
    audit,
    marks,
    loading,
    login: async (email, password) => {
      if (!password) return null;
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!profile || profile.status !== "verified") {
        await supabase.auth.signOut();
        return null;
      }

      const user = mapProfile(profile);
      setCurrentUser(user);
      return user;
    },
    loginAs: () => {
      // No-op in Supabase mode — real auth required
    },
    logout: async () => {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setSession(null);
    },
    registerUser: async ({ name, email, phone, password, role }) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: password || "12345678",
        options: { data: { name, role } },
      });
      if (error) throw error;
      if (data.user) {
        // Update profile with phone and role
        await supabase
          .from("profiles")
          .update({ phone, role, name })
          .eq("id", data.user.id);
      }
    },
    createSchool: async ({ name, location, phone, email }) => {
      const school = {
        id: uid(),
        name,
        location,
        phone,
        email,
        created_at: today(),
        active: true,
      };
      await supabase.from("schools").insert(school);
      const mapped = mapSchool(school);
      setSchools((prev) => [...prev, mapped]);
      await logAction(currentUser, "Created school", name);
      return mapped;
    },
    updateSchool: async (id, data) => {
      const update: any = {};
      if (data.name !== undefined) update.name = data.name;
      if (data.location !== undefined) update.location = data.location;
      if (data.phone !== undefined) update.phone = data.phone;
      if (data.email !== undefined) update.email = data.email;
      if (data.active !== undefined) update.active = data.active;
      await supabase.from("schools").update(update).eq("id", id);
      setSchools((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
    },
    deactivateSchool: async (id) => {
      await supabase.from("schools").update({ active: false }).eq("id", id);
      setSchools((prev) => prev.map((s) => (s.id === id ? { ...s, active: false } : s)));
      const sc = schools.find((x) => x.id === id);
      if (sc) await logAction(currentUser, "Deactivated school", sc.name);
    },
    createSchoolAdmin: async (schoolId, { name, email, phone, password }) => {
      // Check if email already exists in profiles
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (existing) return null;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role: "admin" } },
      });
      if (error || !data.user) return null;

      // Update profile with admin role, verified status, school assignment
      await supabase
        .from("profiles")
        .update({
          role: "admin",
          status: "verified",
          phone,
          school_id: schoolId,
        })
        .eq("id", data.user.id);

      const newAdmin: User = {
        id: data.user.id,
        name,
        email,
        role: "admin",
        status: "verified",
        phone,
        schoolId,
        registeredAt: today(),
      };
      setUsers((prev) => [...prev, newAdmin]);

      const sc = schools.find((x) => x.id === schoolId);
      await logAction(currentUser, "Created admin", `${name} for ${sc?.name ?? schoolId}`);
      return newAdmin;
    },
    assignAdminToSchool: async (userId, schoolId) => {
      await supabase
        .from("profiles")
        .update({ school_id: schoolId, status: "verified" })
        .eq("id", userId);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, schoolId, role: u.role === "admin" ? u.role : "admin", status: "verified" } : u
        )
      );
      const u = users.find((x) => x.id === userId);
      const sc = schools.find((x) => x.id === schoolId);
      if (u && sc) await logAction(currentUser, "Assigned admin", `${u.name} -> ${sc.name}`);
    },
    unassignAdmin: async (userId) => {
      await supabase
        .from("profiles")
        .update({ school_id: null })
        .eq("id", userId);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, schoolId: undefined } : u)));
      const u = users.find((x) => x.id === userId);
      if (u) await logAction(currentUser, "Unassigned admin", u.name);
    },
    approveTeacher: async (id) => {
      await supabase.from("profiles").update({ status: "verified" }).eq("id", id);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: "verified" } : u)));
      const t = users.find((u) => u.id === id);
      if (t) await logAction(currentUser, "Approved teacher", t.name);
    },
    rejectTeacher: async (id) => {
      await supabase.from("profiles").update({ status: "rejected" }).eq("id", id);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: "rejected" } : u)));
      const t = users.find((u) => u.id === id);
      if (t) await logAction(currentUser, "Rejected teacher", t.name);
    },
    addPupil: async (data) => {
      const pupil = {
        id: uid(),
        admission_no: data.admissionNo,
        first_name: data.firstName,
        last_name: data.lastName,
        gender: data.gender,
        dob: data.dob,
        class_id: data.classId,
        active: true,
        parent_ids: data.parentIds,
      };
      await supabase.from("pupils").insert(pupil);
      const mapped: Pupil = {
        ...data,
        id: pupil.id,
        active: true,
      };
      setPupils((prev) => [...prev, mapped]);
      await logAction(currentUser, "Registered pupil", `${mapped.firstName} ${mapped.lastName} (${mapped.admissionNo})`);
    },
    updatePupil: async (id, data) => {
      const update: any = {};
      if (data.admissionNo !== undefined) update.admission_no = data.admissionNo;
      if (data.firstName !== undefined) update.first_name = data.firstName;
      if (data.lastName !== undefined) update.last_name = data.lastName;
      if (data.gender !== undefined) update.gender = data.gender;
      if (data.dob !== undefined) update.dob = data.dob;
      if (data.classId !== undefined) update.class_id = data.classId;
      if (data.active !== undefined) update.active = data.active;
      if (data.parentIds !== undefined) update.parent_ids = data.parentIds;
      await supabase.from("pupils").update(update).eq("id", id);
      setPupils((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
    },
    deactivatePupil: async (id) => {
      await supabase.from("pupils").update({ active: false }).eq("id", id);
      setPupils((prev) => prev.map((p) => (p.id === id ? { ...p, active: false } : p)));
    },
    addParent: async (data) => {
      const parent = {
        id: uid(),
        name: data.name,
        phone: data.phone,
        email: data.email,
        relationship: data.relationship,
      };
      await supabase.from("parents").insert(parent);
      const mapped: Parent = { ...data, id: parent.id };
      setParents((prev) => [...prev, mapped]);
      await logAction(currentUser, "Registered parent", mapped.name);
    },
    markArrival: async (pupilId, transportDetails) => {
      const t = time();
      const d = today();
      const existing = attendance.find((a) => a.pupilId === pupilId && a.date === d);
      if (existing && existing.arrival) return;

      const updateData = {
        arrival: t,
        arrival_transport: transportDetails?.transport,
        arrival_vehicle_reg: transportDetails?.vehicleReg,
        arrival_person_name: transportDetails?.personName,
        arrival_person_relation: transportDetails?.personRelation,
        arrival_phone: transportDetails?.phone,
      };

      if (existing) {
        await supabase.from("attendance").update(updateData).eq("id", existing.id);
        setAttendance((prev) =>
          prev.map((a) =>
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
        );
      } else {
        const rec = {
          id: uid(),
          pupil_id: pupilId,
          date: d,
          ...updateData,
        };
        await supabase.from("attendance").insert(rec);
        const mapped: Attendance = {
          id: rec.id,
          pupilId,
          date: d,
          arrival: t,
          arrivalTransport: transportDetails?.transport,
          arrivalVehicleReg: transportDetails?.vehicleReg,
          arrivalPersonName: transportDetails?.personName,
          arrivalPersonRelation: transportDetails?.personRelation,
          arrivalPhone: transportDetails?.phone,
        };
        setAttendance((prev) => [...prev, mapped]);
      }

      const pupil = pupils.find((p) => p.id === pupilId);
      if (pupil) {
        await sendNotifications(pupil, "arrival", t);
        await logAction(currentUser, "Marked arrival", `${pupil.firstName} ${pupil.lastName}`);
      }
    },
    markDeparture: async (pupilId, transportDetails) => {
      const t = time();
      const d = today();
      const existing = attendance.find((a) => a.pupilId === pupilId && a.date === d);
      if (existing && existing.departure) return;

      const updateData = {
        departure: t,
        departure_transport: transportDetails?.transport,
        departure_vehicle_reg: transportDetails?.vehicleReg,
        departure_person_name: transportDetails?.personName,
        departure_person_relation: transportDetails?.personRelation,
        departure_phone: transportDetails?.phone,
      };

      if (existing) {
        await supabase.from("attendance").update(updateData).eq("id", existing.id);
        setAttendance((prev) =>
          prev.map((a) =>
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
        );
      } else {
        const rec = {
          id: uid(),
          pupil_id: pupilId,
          date: d,
          ...updateData,
        };
        await supabase.from("attendance").insert(rec);
        const mapped: Attendance = {
          id: rec.id,
          pupilId,
          date: d,
          departure: t,
          departureTransport: transportDetails?.transport,
          departureVehicleReg: transportDetails?.vehicleReg,
          departurePersonName: transportDetails?.personName,
          departurePersonRelation: transportDetails?.personRelation,
          departurePhone: transportDetails?.phone,
        };
        setAttendance((prev) => [...prev, mapped]);
      }

      const pupil = pupils.find((p) => p.id === pupilId);
      if (pupil) {
        await sendNotifications(pupil, "departure", t);
        await logAction(currentUser, "Marked departure", `${pupil.firstName} ${pupil.lastName}`);
      }
    },
    addMark: async (data) => {
      if (!currentUser) return;
      const grade = calculateGrade(data.score, data.maxScore);
      const mark = {
        id: uid(),
        pupil_id: data.pupilId,
        subject: data.subject,
        term: data.term,
        year: data.year,
        score: data.score,
        max_score: data.maxScore,
        grade,
        teacher_comment: data.teacherComment,
        recorded_by: currentUser.id,
        recorded_at: now(),
      };
      await supabase.from("marks").insert(mark);
      const mapped: Mark = {
        ...data,
        id: mark.id,
        grade,
        recordedBy: currentUser.id,
        recordedAt: now(),
      };
      setMarks((prev) => [...prev, mapped]);
      const pupil = pupils.find((p) => p.id === data.pupilId);
      if (pupil) {
        await logAction(currentUser, "Added mark", `${pupil.firstName} ${pupil.lastName} - ${data.subject} (${data.score}/${data.maxScore})`);
      }
    },
    updateMark: async (id, data) => {
      const update: any = {};
      if (data.score !== undefined) update.score = data.score;
      if (data.maxScore !== undefined) update.max_score = data.maxScore;
      if (data.teacherComment !== undefined) update.teacher_comment = data.teacherComment;
      if (data.score !== undefined && data.maxScore !== undefined) {
        update.grade = calculateGrade(data.score, data.maxScore);
      }
      await supabase.from("marks").update(update).eq("id", id);
      setMarks((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                ...m,
                ...data,
                grade: data.score !== undefined && data.maxScore !== undefined ? calculateGrade(data.score, data.maxScore) : m.grade,
              }
            : m
        )
      );
      const mark = marks.find((m) => m.id === id);
      const pupil = mark ? pupils.find((p) => p.id === mark.pupilId) : null;
      if (pupil && mark) {
        await logAction(currentUser, "Updated mark", `${pupil.firstName} ${pupil.lastName} - ${mark.subject}`);
      }
    },
    deleteMark: async (id) => {
      const mark = marks.find((m) => m.id === id);
      const pupil = mark ? pupils.find((p) => p.id === mark.pupilId) : null;
      await supabase.from("marks").delete().eq("id", id);
      setMarks((prev) => prev.filter((m) => m.id !== id));
      if (pupil && mark) {
        await logAction(currentUser, "Deleted mark", `${pupil.firstName} ${pupil.lastName} - ${mark.subject}`);
      }
    },
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
