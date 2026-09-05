import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  getInitialData,
  loginUser,
  registerUser as registerUserDb,
  approveTeacher as approveTeacherDb,
  rejectTeacher as rejectTeacherDb,
  deleteUser as deleteUserDb,
  updateUser as updateUserDb,
  addPupil as addPupilDb,
  bulkAddPupils as bulkAddPupilsDb,
  updatePupil as updatePupilDb,
  deactivatePupil as deactivatePupilDb,
  addParent as addParentDb,
  markArrival as markArrivalDb,
  markDeparture as markDepartureDb,
  addMark as addMarkDb,
  updateMark as updateMarkDb,
  deleteMark as deleteMarkDb,
  saveBulkMarks as saveBulkMarksDb,
  addFee as addFeeDb,
  updateFee as updateFeeDb,
  addSchool as addSchoolDb,
  updateSchool as updateSchoolDb,
  deleteSchool as deleteSchoolDb,
  addClass as addClassDb,
  updateClass as updateClassDb,
  deleteClass as deleteClassDb,
  addSubject as addSubjectDb,
  addSubjectsBulk as addSubjectsBulkDb,
  updateSubject as updateSubjectDb,
  deleteSubject as deleteSubjectDb,
  seedDefaultSubjects as seedDefaultSubjectsDb,
  type Role,
  type TeacherStatus,
  type User,
  type Pupil,
  type Parent,
  type ClassRoom,
  type Attendance,
  type Notification,
  type AuditLog,
  type Mark,
  type School,
  type Subject,
  type Fee,
} from "./db-functions";
import { queryClient, queryKeys } from "./query-client";

// Re-export types so we don't break existing imports in components
export type {
  Role,
  TeacherStatus,
  User,
  Pupil,
  Parent,
  ClassRoom,
  Attendance,
  Notification,
  AuditLog,
  Mark,
  School,
  Subject,
  Fee,
};

interface Store {
  currentUser: User | null;
  selectedSchoolId: string | null;
  users: User[];
  pupils: Pupil[];
  parents: Parent[];
  classes: ClassRoom[];
  attendance: Attendance[];
  notifications: Notification[];
  audit: AuditLog[];
  marks: Mark[];
  schools: School[];
  subjects: Subject[];
  fees: Fee[];
  login: (id: string, password: string) => Promise<User | null>;
  logout: () => void;
  setSchoolContext: (schoolId: string | null) => void;
  registerUser: (data: {
    id: string;
    name: string;
    email: string;
    phone: string;
    password: string;
    role: Role;
    schoolId?: string;
    newSchoolName?: string;
    status?: TeacherStatus;
    subjects?: string[];
    photo?: string;
    classId?: string;
  }) => Promise<void>;
  approveTeacher: (id: string) => Promise<void>;
  rejectTeacher: (id: string) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  updateUser: (
    id: string,
    data: Partial<Omit<User, "id" | "registeredAt">> & { password?: string },
  ) => Promise<void>;
  addPupil: (data: Omit<Pupil, "id" | "active"> & { parent?: Omit<Parent, "id"> }) => Promise<void>;
  bulkAddPupils: (
    pupils: Array<{
      pupil: Omit<Pupil, "id" | "active">;
      parent: Omit<Parent, "id">;
    }>,
  ) => Promise<{
    total: number;
    successCount: number;
    failCount: number;
    results: Array<{
      success: boolean;
      pupilId?: string;
      admissionNo: string;
      name: string;
      error?: string;
    }>;
  }>;
  updatePupil: (id: string, data: Partial<Pupil>) => Promise<void>;
  deactivatePupil: (id: string) => Promise<void>;
  addParent: (data: Omit<Parent, "id">) => Promise<void>;
  markArrival: (
    pupilId: string,
    transportDetails?: {
      transport?: string;
      vehicleReg?: string;
      personName?: string;
      personRelation?: string;
      phone?: string;
    },
  ) => Promise<void>;
  markDeparture: (
    pupilId: string,
    transportDetails?: {
      transport?: string;
      vehicleReg?: string;
      personName?: string;
      personRelation?: string;
      phone?: string;
    },
  ) => Promise<void>;
  addMark: (data: Omit<Mark, "id" | "recordedBy" | "recordedAt">) => Promise<void>;
  updateMark: (
    id: string,
    data: Partial<Omit<Mark, "id" | "recordedBy" | "recordedAt">>,
  ) => Promise<void>;
  deleteMark: (id: string) => Promise<void>;
  saveBulkMarks: (
    marks: Array<{
      id?: string;
      pupilId: string;
      subject: string;
      term: string;
      year: string;
      score: number;
      maxScore: number;
      teacherComment?: string;
    }>,
  ) => Promise<void>;
  addSchool: (data: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  }) => Promise<void>;
  updateSchool: (id: string, data: Partial<Omit<School, "id" | "registeredAt">>) => Promise<void>;
  deleteSchool: (id: string) => Promise<void>;
  addClass: (data: {
    name: string;
    schoolId: string;
    teacherId?: string;
    subjects?: string[];
  }) => Promise<void>;
  updateClass: (id: string, data: Partial<Omit<ClassRoom, "id">>) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  addSubject: (data: { schoolId: string; name: string; code?: string }) => Promise<void>;
  addSubjectsBulk: (data: {
    schoolId: string;
    subjects: Array<{ name: string; code?: string }>;
  }) => Promise<void>;
  updateSubject: (id: string, name: string, code?: string) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  seedDefaultSubjects: (schoolId: string) => Promise<void>;
  addFee: (data: Omit<Fee, "id" | "createdBy" | "createdAt" | "updatedAt">) => Promise<void>;
  updateFee: (
    id: string,
    data: Partial<Pick<Fee, "amountPaid" | "amountDue" | "dueDate" | "notes">>,
  ) => Promise<void>;
  getSchoolSubjects: (schoolId?: string) => Subject[];
  refreshData: () => Promise<void>;
  lastSyncTime: string | null;
  loading: boolean;
  loadError: string | null;
  isPausedError: boolean;
  retryIn: number;
  attemptLoad: () => Promise<void>;
  isLocked: boolean;
  lock: () => void;
  unlock: (password: string) => Promise<boolean>;
  idleTimeoutMs?: number;
}

const Ctx = createContext<Store | null>(null);

const SESSION_KEY = "kinder.currentUserId";
const SCHOOL_CONTEXT_KEY = "kinder.selectedSchoolId";

// ── Helpers ─────────────────────────────────────────────────────────────────
function classifyDbError(err: any): { isPaused: boolean; isPoolExhausted: boolean; message: string } {
  const msg: string = err?.message || err?.toString() || "Unknown error";
  const lowerMsg = msg.toLowerCase();
  // Only classify as paused if explicitly reported as paused by Supabase or PostgREST API
  const isPaused =
    lowerMsg.includes("is_paused") ||
    lowerMsg.includes("project_paused") ||
    lowerMsg.includes("project is paused") ||
    lowerMsg.includes("database is paused");

  // Check if connection pool / max clients limit reached
  const isPoolExhausted =
    lowerMsg.includes("emaxconnsession") ||
    lowerMsg.includes("max clients reached") ||
    lowerMsg.includes("pool_size") ||
    lowerMsg.includes("too many clients") ||
    lowerMsg.includes("connection limit exceeded") ||
    lowerMsg.includes("remaining connection slots are reserved");

  return { isPaused, isPoolExhausted, message: msg };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  // Idle timeout for auto-lock (default 4 minutes)
  const IDLE_DEFAULT = 4 * 60 * 1000;
  const [isLocked, setIsLocked] = useState(() => {
    try {
      const storedLocked = sessionStorage.getItem("kinder.locked");
      return storedLocked === "1";
    } catch {
      return false;
    }
  });
  const idleTimeoutMsRef = useRef<number>(IDLE_DEFAULT);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPausedError, setIsPausedError] = useState(false);
  const [isPoolExhaustedError, setIsPoolExhaustedError] = useState(false);
  const [retryIn, setRetryIn] = useState(0); // seconds until next auto-retry
  const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [state, setState] = useState(() => ({
    currentUserId: null as string | null,
    selectedSchoolId: null as string | null,
    users: [] as User[],
    pupils: [] as Pupil[],
    parents: [] as Parent[],
    classes: [] as ClassRoom[],
    attendance: [] as Attendance[],
    notifications: [] as Notification[],
    audit: [] as AuditLog[],
    marks: [] as Mark[],
    schools: [] as School[],
    subjects: [] as Subject[],
    fees: [] as Fee[],
  }));

  // Hydrate saved session on client post-mount to prevent SSR hydration mismatch (Error #418)
  useEffect(() => {
    try {
      const savedUserId = localStorage.getItem(SESSION_KEY);
      const savedSchoolId = sessionStorage.getItem(SCHOOL_CONTEXT_KEY);
      if (savedUserId || savedSchoolId) {
        setState((s) => ({
          ...s,
          ...(savedUserId ? { currentUserId: savedUserId } : {}),
          ...(savedSchoolId ? { selectedSchoolId: savedSchoolId } : {}),
        }));
      }
    } catch {}
  }, []);

  // ── Auto-retry countdown timer ───────────────────────────────────────────────
  const startRetryCountdown = useCallback((seconds: number, onFire: () => void) => {
    if (retryTimerRef.current) clearInterval(retryTimerRef.current);
    setRetryIn(seconds);
    let remaining = seconds;
    retryTimerRef.current = setInterval(() => {
      remaining -= 1;
      setRetryIn(remaining);
      if (remaining <= 0) {
        clearInterval(retryTimerRef.current!);
        retryTimerRef.current = null;
        onFire();
      }
    }, 1000);
  }, []);

  // ── Load database on mount (and on manual retry) ─────────────────────────────
  const attemptLoad = useCallback(async () => {
    // Clear any existing countdown
    if (retryTimerRef.current) {
      clearInterval(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    setLoading(true);
    setLoadError(null);
    setIsPausedError(false);
    setIsPoolExhaustedError(false);
    setRetryIn(0);

    // Timeout guard — retries connection if loading takes longer than 25 seconds
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      setLoadError("Database connection timed out. Attempting to reconnect...");
      setIsPausedError(false);
      setIsPoolExhaustedError(false);
      setLoading(false);
      startRetryCountdown(15, attemptLoad);
    }, 25000);

    try {
      const data = (await getInitialData({
        data: { userId: state.currentUserId ?? undefined },
      })) as any;
      if (data?.error) {
        throw new Error(data.error);
      }
      if (timedOut) return; // already shown error, ignore late response
      clearTimeout(timeoutId);
      setState((s) => ({
        ...s,
        schools: data.schools?.length ? data.schools : s.schools,
        users: data.users?.length ? data.users : s.users,
        pupils: data.pupils ?? s.pupils,
        parents: data.parents ?? s.parents,
        classes: data.classes ?? s.classes,
        attendance: data.attendance ?? s.attendance,
        notifications: data.notifications ?? s.notifications,
        audit: data.audit ?? s.audit,
        marks: data.marks ?? s.marks,
        subjects: data.subjects ?? s.subjects,
        fees: data.fees ?? s.fees,
      }));
      setLastSyncTime(new Date().toLocaleTimeString());
      queryClient.setQueryData(queryKeys.initialData(state.currentUserId), data);
      setLoadError(null);
      setIsPausedError(false);
      setIsPoolExhaustedError(false);
      setLoading(false);
    } catch (err: any) {
      if (timedOut) return;
      clearTimeout(timeoutId);
      console.error("Failed to load live database data:", err);
      const { isPaused, isPoolExhausted, message } = classifyDbError(err);
      setLoadError(message);
      setIsPausedError(isPaused);
      setIsPoolExhaustedError(isPoolExhausted);
      setLoading(false);
      // Auto-retry every 10-15 seconds for paused-project or connection pool errors
      if (isPaused) {
        startRetryCountdown(15, attemptLoad);
      } else if (isPoolExhausted) {
        startRetryCountdown(10, attemptLoad);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startRetryCountdown, state.currentUserId]);

  useEffect(() => {
    attemptLoad();
    return () => {
      if (retryTimerRef.current) clearInterval(retryTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh function to reload data from database
  const refreshData = useCallback(async () => {
    try {
      const data = (await getInitialData({
        data: { userId: state.currentUserId ?? undefined },
      })) as any;
      if (!data || data.error || !data.users || data.users.length === 0) {
        console.warn(
          "refreshData returned error or empty users, preserving existing state:",
          data?.error,
        );
        return;
      }
      setState((s) => ({
        ...s,
        schools: data.schools?.length ? data.schools : s.schools,
        users: data.users?.length ? data.users : s.users,
        pupils: data.pupils ?? s.pupils,
        parents: data.parents ?? s.parents,
        classes: data.classes ?? s.classes,
        attendance: data.attendance ?? s.attendance,
        notifications: data.notifications ?? s.notifications,
        audit: data.audit ?? s.audit,
        marks: data.marks ?? s.marks,
        subjects: data.subjects ?? s.subjects,
      }));
      setLastSyncTime(new Date().toLocaleTimeString());
      queryClient.setQueryData(queryKeys.initialData(state.currentUserId), data);
    } catch (err) {
      console.error("Failed to refresh database data:", err);
    }
  }, [state.currentUserId]);

  // Sync user session to local storage
  useEffect(() => {
    try {
      if (state.currentUserId) {
        localStorage.setItem(SESSION_KEY, state.currentUserId);
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch {}
  }, [state.currentUserId]);

  // ── Inactivity / Auto-lock logic ───────────────────────────────────────────
  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const startIdleTimer = useCallback(() => {
    clearIdleTimer();
    // Only start when a user is signed in
    if (!state.currentUserId) return;
    idleTimerRef.current = setTimeout(() => {
      setIsLocked(true);
      try {
        sessionStorage.setItem("kinder.locked", "1");
      } catch {}
    }, idleTimeoutMsRef.current);
  }, [clearIdleTimer, state.currentUserId]);

  const onUserActivity = useCallback(() => {
    // If locked, do not auto-unlock — require password
    if (isLocked) return;
    startIdleTimer();
  }, [isLocked, startIdleTimer]);

  useEffect(() => {
    // Attach activity listeners on client
    const ev = ["mousemove", "keydown", "mousedown", "touchstart", "click"] as const;
    ev.forEach((e) => window.addEventListener(e, onUserActivity));
    // Reset timer when visibility changes to visible
    const onVisibility = () => {
      if (document.visibilityState === "visible") onUserActivity();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Start timer initially (only when user present)
    startIdleTimer();

    return () => {
      ev.forEach((e) => window.removeEventListener(e, onUserActivity));
      document.removeEventListener("visibilitychange", onVisibility);
      clearIdleTimer();
    };
  }, [onUserActivity, startIdleTimer, clearIdleTimer]);

  // lock/unlock helpers
  const lock = useCallback(() => {
    setIsLocked(true);
    try {
      sessionStorage.setItem("kinder.locked", "1");
    } catch {}
  }, []);

  const unlock = useCallback(
    async (password: string) => {
      // Validate password for current user id
      if (!state.currentUserId) return false;
      try {
        const u = await loginUser({ data: { id: state.currentUserId, password } });
        if (u) {
          setIsLocked(false);
          try {
            sessionStorage.removeItem("kinder.locked");
          } catch {}
          // refresh idle timer
          startIdleTimer();
          return true;
        }
      } catch (err) {
        console.error("Unlock failed:", err);
      }
      return false;
    },
    [state.currentUserId, startIdleTimer],
  );

  // Sync school context to session storage
  useEffect(() => {
    try {
      if (state.selectedSchoolId) {
        sessionStorage.setItem(SCHOOL_CONTEXT_KEY, state.selectedSchoolId);
      } else {
        sessionStorage.removeItem(SCHOOL_CONTEXT_KEY);
      }
    } catch {}
  }, [state.selectedSchoolId]);

  const currentUser = useMemo(
    () => state.users.find((u: User) => u.id === state.currentUserId) ?? null,
    [state.users, state.currentUserId],
  );

  const filteredUsers = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === "super_admin") {
      // Super admin with school context: filter by selected school
      if (state.selectedSchoolId) {
        return state.users.filter((u) => u.schoolId === state.selectedSchoolId);
      }
      // Super admin without school context: see all users
      return state.users;
    }
    // School-scoped users: see their school's users, unassigned users, or all teachers
    if (!currentUser.schoolId) {
      return state.users;
    }
    return state.users.filter(
      (u) => !u.schoolId || u.schoolId === currentUser.schoolId || u.role === "teacher",
    );
  }, [state.users, currentUser, state.selectedSchoolId]);

  const filteredClasses = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === "super_admin") {
      if (state.selectedSchoolId) {
        return state.classes.filter((c) => c.schoolId === state.selectedSchoolId);
      }
      return state.classes;
    }
    return state.classes.filter((c) => c.schoolId === currentUser.schoolId);
  }, [state.classes, currentUser, state.selectedSchoolId]);

  const filteredPupils = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === "super_admin") {
      if (state.selectedSchoolId) {
        return state.pupils.filter((p) => p.schoolId === state.selectedSchoolId);
      }
      return state.pupils;
    }
    return state.pupils.filter((p) => p.schoolId === currentUser.schoolId);
  }, [state.pupils, currentUser, state.selectedSchoolId]);

  const filteredParents = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === "super_admin") {
      if (state.selectedSchoolId) {
        return state.parents.filter((p) => p.schoolId === state.selectedSchoolId);
      }
      return state.parents;
    }
    return state.parents.filter((p) => p.schoolId === currentUser.schoolId);
  }, [state.parents, currentUser, state.selectedSchoolId]);

  const filteredAttendance = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === "super_admin") {
      if (state.selectedSchoolId) {
        return state.attendance.filter(
          (a) => state.pupils.find((p) => p.id === a.pupilId)?.schoolId === state.selectedSchoolId,
        );
      }
      return state.attendance;
    }
    return state.attendance.filter(
      (a) => state.pupils.find((p) => p.id === a.pupilId)?.schoolId === currentUser.schoolId,
    );
  }, [state.attendance, state.pupils, currentUser, state.selectedSchoolId]);

  const filteredNotifications = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === "super_admin") {
      if (state.selectedSchoolId) {
        return state.notifications.filter(
          (n) => state.pupils.find((p) => p.id === n.pupilId)?.schoolId === state.selectedSchoolId,
        );
      }
      return state.notifications;
    }
    return state.notifications.filter(
      (n) => state.pupils.find((p) => p.id === n.pupilId)?.schoolId === currentUser.schoolId,
    );
  }, [state.notifications, state.pupils, currentUser, state.selectedSchoolId]);

  const filteredAudit = useMemo(() => {
    if (!currentUser) return [];
    const nonCacheAudit = (state.audit || []).filter((a) => {
      if (!a) return false;
      const action = (a.action || "").toLowerCase();
      const target = (a.target || "").toLowerCase();
      const actorName = (a.actorName || "").toLowerCase();
      return !action.includes("cache") && !target.includes("cache") && !actorName.includes("cache");
    });
    if (currentUser.role === "super_admin") {
      if (state.selectedSchoolId) {
        return nonCacheAudit.filter(
          (a) => state.users.find((u) => u.id === a.actorId)?.schoolId === state.selectedSchoolId,
        );
      }
      return nonCacheAudit;
    }
    return nonCacheAudit.filter(
      (a) => state.users.find((u) => u.id === a.actorId)?.schoolId === currentUser.schoolId,
    );
  }, [state.audit, state.users, currentUser, state.selectedSchoolId]);

  const filteredMarks = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === "super_admin") {
      if (state.selectedSchoolId) {
        return state.marks.filter(
          (m) => state.pupils.find((p) => p.id === m.pupilId)?.schoolId === state.selectedSchoolId,
        );
      }
      return state.marks;
    }
    return state.marks.filter(
      (m) => state.pupils.find((p) => p.id === m.pupilId)?.schoolId === currentUser.schoolId,
    );
  }, [state.marks, state.pupils, currentUser, state.selectedSchoolId]);

  const filteredFees = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === "super_admin") {
      return state.selectedSchoolId
        ? state.fees.filter((fee) => fee.schoolId === state.selectedSchoolId)
        : state.fees;
    }
    return state.fees.filter((fee) => fee.schoolId === currentUser.schoolId);
  }, [state.fees, currentUser, state.selectedSchoolId]);

  const store: Store = {
    currentUser,
    selectedSchoolId: state.selectedSchoolId,
    users: filteredUsers,
    pupils: filteredPupils,
    parents: filteredParents,
    classes: filteredClasses,
    attendance: filteredAttendance,
    notifications: filteredNotifications,
    audit: filteredAudit,
    marks: filteredMarks,
    fees: filteredFees,
    schools: state.schools,
    lastSyncTime,
    loading,
    loadError,
    isPausedError,
    retryIn,
    attemptLoad,

    login: async (id, password) => {
      const u = await loginUser({ data: { id, password } });
      if (u) {
        setState((s) => ({ ...s, currentUserId: u.id }));
      }
      return u;
    },

    logout: () => {
      setState((s) => ({ ...s, currentUserId: null, selectedSchoolId: null }));
      setIsLocked(false);
      try {
        sessionStorage.removeItem("kinder.locked");
      } catch {}
    },

    setSchoolContext: (schoolId: string | null) => {
      setState((s) => ({ ...s, selectedSchoolId: schoolId }));
    },

    registerUser: async ({
      id,
      name,
      email,
      phone,
      password,
      role,
      schoolId,
      newSchoolName,
      status,
      subjects,
      photo,
      classId,
    }) => {
      const res = await registerUserDb({
        data: {
          id,
          name,
          email,
          phone,
          password,
          role,
          schoolId,
          newSchoolName,
          status,
          subjects,
          photo,
          classId,
        },
      });
      setState((s) => {
        const nextUsers = [...s.users, res.user];
        const nextSchools = res.school ? [...s.schools, res.school] : s.schools;
        return {
          ...s,
          users: nextUsers,
          schools: nextSchools,
        };
      });
    },

    approveTeacher: async (id) => {
      if (!currentUser) return;
      await approveTeacherDb({
        data: { id, actorId: currentUser.id, actorName: currentUser.name },
      });
      setState((s) => ({
        ...s,
        users: s.users.map((u: User) => (u.id === id ? { ...u, status: "verified" } : u)),
        audit: [
          {
            id: Math.random().toString(36).slice(2, 10),
            actorId: currentUser.id,
            actorName: currentUser.name,
            action: "Approved teacher",
            target: s.users.find((u) => u.id === id)?.name || id,
            timestamp: new Date().toISOString(),
          },
          ...s.audit,
        ],
      }));
    },

    rejectTeacher: async (id) => {
      if (!currentUser) return;
      await rejectTeacherDb({ data: { id, actorId: currentUser.id, actorName: currentUser.name } });
      setState((s) => ({
        ...s,
        users: s.users.map((u: User) => (u.id === id ? { ...u, status: "rejected" } : u)),
        audit: [
          {
            id: Math.random().toString(36).slice(2, 10),
            actorId: currentUser.id,
            actorName: currentUser.name,
            action: "Rejected teacher",
            target: s.users.find((u) => u.id === id)?.name || id,
            timestamp: new Date().toISOString(),
          },
          ...s.audit,
        ],
      }));
    },

    deleteUser: async (id) => {
      if (!currentUser) return;
      await deleteUserDb({ data: { id, actorId: currentUser.id, actorName: currentUser.name } });
      setState((s) => {
        const deletedUser = s.users.find((u) => u.id === id);
        return {
          ...s,
          users: s.users.filter((u) => u.id !== id),
          audit: [
            {
              id: Math.random().toString(36).slice(2, 10),
              actorId: currentUser.id,
              actorName: currentUser.name,
              action: "Deleted user",
              target: deletedUser ? `${deletedUser.name} (${deletedUser.role})` : id,
              timestamp: new Date().toISOString(),
            },
            ...s.audit,
          ],
        };
      });
    },

    updateUser: async (id, data) => {
      if (!currentUser) return;
      await updateUserDb({
        data: {
          id,
          actorId: currentUser.id,
          actorName: currentUser.name,
          data,
        },
      });
      setState((s) => {
        const existing = (s.users || []).find((u) => u.id === id);
        return {
          ...s,
          users: (s.users || []).map((u) => (u.id === id ? { ...u, ...data } : u)),
          audit: [
            {
              id: Math.random().toString(36).slice(2, 10),
              actorId: currentUser.id,
              actorName: currentUser.name,
              action: "Updated user profile",
              target: data.name || existing?.name || id,
              timestamp: new Date().toISOString(),
            },
            ...(s.audit || []),
          ],
        };
      });
    },

    addPupil: async (pupilData) => {
      if (!currentUser) return;
      const { parent, ...pupil } = pupilData as Omit<Pupil, "id" | "active"> & {
        parent?: Omit<Parent, "id">;
      };
      let createdParent: Parent | undefined;
      const schoolId = (pupil as any).schoolId || currentUser.schoolId;

      if (parent) {
        createdParent = await addParentDb({
          data: {
            parent: { ...parent, schoolId },
            actorId: currentUser.id,
            actorName: currentUser.name,
          },
        });
      }

      const newPupil = await addPupilDb({
        data: {
          pupil: {
            ...pupil,
            parentIds: createdParent
              ? [createdParent.id, ...(pupil.parentIds ?? [])]
              : (pupil.parentIds ?? []),
            schoolId,
          },
          parent: (parent
            ? { ...parent, schoolId }
            : { name: "", phone: "", email: "", relationship: "" }) as any,
          actorId: currentUser.id,
          actorName: currentUser.name,
        },
      });

      // Refresh data from database to ensure dashboard updates
      await refreshData();
    },

    bulkAddPupils: async (pupils) => {
      if (!currentUser)
        return {
          total: 0,
          successCount: 0,
          failCount: 0,
          results: [],
        };

      const schoolId = currentUser.schoolId;

      const result = await bulkAddPupilsDb({
        data: {
          pupils: pupils.map(({ pupil, parent }) => ({
            pupil: {
              ...pupil,
              schoolId: schoolId || pupil.schoolId,
            },
            parent,
          })),
          actorId: currentUser.id,
          actorName: currentUser.name,
        },
      });

      // Refresh data from database to show new pupils
      await refreshData();

      return result;
    },

    updatePupil: async (id, data) => {
      await updatePupilDb({ data: { id, data } });
      setState((s) => ({
        ...s,
        pupils: s.pupils.map((p: Pupil) => (p.id === id ? { ...p, ...data } : p)),
      }));
    },

    deactivatePupil: async (id) => {
      await deactivatePupilDb({ data: { id } });
      setState((s) => ({
        ...s,
        pupils: s.pupils.map((p: Pupil) => (p.id === id ? { ...p, active: false } : p)),
      }));
    },

    addParent: async (parentData) => {
      if (!currentUser) return;
      const schoolId = (parentData as any).schoolId || currentUser.schoolId;
      const newParent = await addParentDb({
        data: {
          parent: { ...parentData, schoolId },
          actorId: currentUser.id,
          actorName: currentUser.name,
        },
      });
      setState((s) => ({
        ...s,
        parents: [...s.parents, newParent],
        audit: [
          {
            id: Math.random().toString(36).slice(2, 10),
            actorId: currentUser.id,
            actorName: currentUser.name,
            action: "Registered parent",
            target: newParent.name,
            timestamp: new Date().toISOString(),
          },
          ...s.audit,
        ],
      }));
    },

    markArrival: async (pupilId, transportDetails) => {
      if (!currentUser) return;
      const pupil = state.pupils.find((p) => p.id === pupilId);
      const parent = pupil?.parentIds?.[0]
        ? state.parents.find((pr) => pr.id === pupil.parentIds[0])
        : null;

      const finalDetails = {
        transport: transportDetails?.transport || "Car",
        vehicleReg: transportDetails?.vehicleReg || "",
        personName: transportDetails?.personName || parent?.name || "Parent/Guardian",
        personRelation: transportDetails?.personRelation || parent?.relationship || "Parent",
        phone: transportDetails?.phone || parent?.phone || "",
      };

      const date = new Date().toISOString().slice(0, 10);
      const time = new Date().toTimeString().slice(0, 5);

      // Optimistic state update for instant UI feedback across Dashboard & Attendance
      setState((s) => {
        const existingIndex = s.attendance.findIndex(
          (a) => a.pupilId === pupilId && a.date === date,
        );
        let updatedAtt: Attendance;
        if (existingIndex >= 0) {
          updatedAtt = {
            ...s.attendance[existingIndex],
            arrival: time,
            arrivalTransport: finalDetails.transport,
            arrivalVehicleReg: finalDetails.vehicleReg,
            arrivalPersonName: finalDetails.personName,
            arrivalPersonRelation: finalDetails.personRelation,
            arrivalPhone: finalDetails.phone,
          };
        } else {
          updatedAtt = {
            id: Math.random().toString(36).slice(2, 10),
            pupilId,
            date,
            arrival: time,
            arrivalTransport: finalDetails.transport,
            arrivalVehicleReg: finalDetails.vehicleReg,
            arrivalPersonName: finalDetails.personName,
            arrivalPersonRelation: finalDetails.personRelation,
            arrivalPhone: finalDetails.phone,
          };
        }

        const nextAttendance =
          existingIndex >= 0
            ? s.attendance.map((a, i) => (i === existingIndex ? updatedAtt : a))
            : [updatedAtt, ...s.attendance];

        return { ...s, attendance: nextAttendance };
      });

      try {
        const res = await markArrivalDb({
          data: {
            pupilId,
            transportDetails: finalDetails,
            actorId: currentUser.id,
            actorName: currentUser.name,
          },
        });

        setState((s) => {
          const exists = s.attendance.some((a) => a.id === res.attendance.id);
          const nextAtt = exists
            ? s.attendance.map((a) => (a.id === res.attendance.id ? res.attendance : a))
            : [res.attendance, ...s.attendance];

          return {
            ...s,
            attendance: nextAtt,
            notifications: [
              ...res.notifications,
              ...s.notifications.filter(
                (n) => !res.notifications.some((rn: any) => rn.id === n.id),
              ),
            ],
            audit: [res.audit, ...s.audit.filter((a) => a.id !== res.audit.id)],
          };
        });
      } catch (err) {
        console.error("Failed to persist markArrival to server DB:", err);
      }
    },

    markDeparture: async (pupilId, transportDetails) => {
      if (!currentUser) return;
      const pupil = state.pupils.find((p) => p.id === pupilId);
      const parent = pupil?.parentIds?.[0]
        ? state.parents.find((pr) => pr.id === pupil.parentIds[0])
        : null;

      const finalDetails = {
        transport: transportDetails?.transport || "Car",
        vehicleReg: transportDetails?.vehicleReg || "",
        personName: transportDetails?.personName || parent?.name || "Parent/Guardian",
        personRelation: transportDetails?.personRelation || parent?.relationship || "Parent",
        phone: transportDetails?.phone || parent?.phone || "",
      };

      const date = new Date().toISOString().slice(0, 10);
      const time = new Date().toTimeString().slice(0, 5);

      // Optimistic state update
      setState((s) => {
        const existingIndex = s.attendance.findIndex(
          (a) => a.pupilId === pupilId && a.date === date,
        );
        let updatedAtt: Attendance;
        if (existingIndex >= 0) {
          updatedAtt = {
            ...s.attendance[existingIndex],
            departure: time,
            departureTransport: finalDetails.transport,
            departureVehicleReg: finalDetails.vehicleReg,
            departurePersonName: finalDetails.personName,
            departurePersonRelation: finalDetails.personRelation,
            departurePhone: finalDetails.phone,
          };
        } else {
          updatedAtt = {
            id: Math.random().toString(36).slice(2, 10),
            pupilId,
            date,
            departure: time,
            departureTransport: finalDetails.transport,
            departureVehicleReg: finalDetails.vehicleReg,
            departurePersonName: finalDetails.personName,
            departurePersonRelation: finalDetails.personRelation,
            departurePhone: finalDetails.phone,
          };
        }

        const nextAttendance =
          existingIndex >= 0
            ? s.attendance.map((a, i) => (i === existingIndex ? updatedAtt : a))
            : [updatedAtt, ...s.attendance];

        return { ...s, attendance: nextAttendance };
      });

      try {
        const res = await markDepartureDb({
          data: {
            pupilId,
            transportDetails: finalDetails,
            actorId: currentUser.id,
            actorName: currentUser.name,
          },
        });

        setState((s) => {
          const exists = s.attendance.some((a) => a.id === res.attendance.id);
          const nextAtt = exists
            ? s.attendance.map((a) => (a.id === res.attendance.id ? res.attendance : a))
            : [res.attendance, ...s.attendance];

          return {
            ...s,
            attendance: nextAtt,
            notifications: [
              ...res.notifications,
              ...s.notifications.filter(
                (n) => !res.notifications.some((rn: any) => rn.id === n.id),
              ),
            ],
            audit: [res.audit, ...s.audit.filter((a) => a.id !== res.audit.id)],
          };
        });
      } catch (err) {
        console.error("Failed to persist markDeparture to server DB:", err);
      }
    },

    addMark: async (markData) => {
      if (!currentUser) return;
      const newMark = await addMarkDb({ data: { mark: markData, actorId: currentUser.id } });
      const pupil = state.pupils.find((p: Pupil) => p.id === markData.pupilId);

      setState((s) => ({
        ...s,
        marks: [newMark, ...s.marks],
        audit: [
          {
            id: Math.random().toString(36).slice(2, 10),
            actorId: currentUser.id,
            actorName: currentUser.name,
            action: "Added mark",
            target: pupil
              ? `${pupil.firstName} ${pupil.lastName} - ${markData.subject} (${markData.score}/${markData.maxScore})`
              : markData.subject,
            timestamp: new Date().toISOString(),
          },
          ...s.audit,
        ],
      }));
    },

    updateMark: async (id, markData) => {
      if (!currentUser) return;
      const res = await updateMarkDb({ data: { id, data: markData, actorId: currentUser.id } });

      setState((s) => {
        const existingMark = s.marks.find((m) => m.id === id);
        const pupil = existingMark ? s.pupils.find((p) => p.id === existingMark.pupilId) : null;

        return {
          ...s,
          marks: s.marks.map((m) => (m.id === id ? { ...m, ...res.data } : m)),
          audit: [
            {
              id: Math.random().toString(36).slice(2, 10),
              actorId: currentUser.id,
              actorName: currentUser.name,
              action: "Updated mark",
              target:
                pupil && existingMark
                  ? `${pupil.firstName} ${pupil.lastName} - ${existingMark.subject}`
                  : "Mark",
              timestamp: new Date().toISOString(),
            },
            ...s.audit,
          ],
        };
      });
    },

    deleteMark: async (id) => {
      if (!currentUser) return;
      await deleteMarkDb({ data: { id } });

      setState((s) => {
        const existingMark = s.marks.find((m) => m.id === id);
        const pupil = existingMark ? s.pupils.find((p) => p.id === existingMark.pupilId) : null;

        return {
          ...s,
          marks: s.marks.filter((m) => m.id !== id),
          audit: [
            {
              id: Math.random().toString(36).slice(2, 10),
              actorId: currentUser.id,
              actorName: currentUser.name,
              action: "Deleted mark",
              target:
                pupil && existingMark
                  ? `${pupil.firstName} ${pupil.lastName} - ${existingMark.subject}`
                  : "Mark",
              timestamp: new Date().toISOString(),
            },
            ...s.audit,
          ],
        };
      });
    },

    saveBulkMarks: async (markItems) => {
      if (!currentUser || !markItems.length) return;
      const savedMarks = await saveBulkMarksDb({
        data: { marks: markItems, actorId: currentUser.id },
      });

      setState((s) => {
        const savedIds = new Set(savedMarks.map((m: any) => m.id));
        const updatedMarksList = [...savedMarks, ...s.marks.filter((m) => !savedIds.has(m.id))];

        return {
          ...s,
          marks: updatedMarksList,
          audit: [
            {
              id: Math.random().toString(36).slice(2, 10),
              actorId: currentUser.id,
              actorName: currentUser.name,
              action: "Batch saved marks",
              target: `${savedMarks.length} mark(s) saved for ${markItems[0]?.subject || "class"}`,
              timestamp: new Date().toISOString(),
            },
            ...s.audit,
          ],
        };
      });
    },

    addFee: async (feeData) => {
      if (!currentUser) return;
      const newFee = await addFeeDb({
        data: { fee: feeData, actorId: currentUser.id, actorName: currentUser.name },
      });
      setState((s) => ({ ...s, fees: [newFee, ...s.fees] }));
    },

    updateFee: async (id, feeData) => {
      if (!currentUser) return;
      const result = await updateFeeDb({
        data: { id, data: feeData, actorId: currentUser.id, actorName: currentUser.name },
      });
      setState((s) => ({
        ...s,
        fees: s.fees.map((fee) => (fee.id === id ? { ...fee, ...result.data } : fee)),
      }));
    },

    addSchool: async (schoolData) => {
      const newSchool = await addSchoolDb({ data: schoolData });
      setState((s) => ({
        ...s,
        schools: [...s.schools, newSchool],
      }));
    },

    updateSchool: async (id, schoolData) => {
      const res = await updateSchoolDb({ data: { id, data: schoolData } });
      setState((s) => ({
        ...s,
        schools: s.schools.map((sch) => (sch.id === id ? { ...sch, ...res.data } : sch)),
      }));
    },

    deleteSchool: async (id) => {
      await deleteSchoolDb({ data: { id } });
      setState((s) => ({
        ...s,
        schools: s.schools.filter((sch) => sch.id !== id),
        users: s.users.filter((u) => u.schoolId !== id),
        classes: s.classes.filter((c) => c.schoolId !== id),
        pupils: s.pupils.filter((p) => p.schoolId !== id),
      }));
    },

    addClass: async (classData) => {
      const newClass = await addClassDb({ data: classData });
      setState((s) => ({
        ...s,
        classes: [...s.classes, newClass],
        users: classData.teacherId
          ? s.users.map((u) => (u.id === classData.teacherId ? { ...u, classId: newClass.id } : u))
          : s.users,
      }));
    },

    updateClass: async (id, classData) => {
      const res = await updateClassDb({ data: { id, data: classData } });
      setState((s) => ({
        ...s,
        classes: s.classes.map((cls) => (cls.id === id ? { ...cls, ...res.data } : cls)),
        users:
          classData.teacherId !== undefined
            ? s.users.map((u) => {
                if (u.classId === id) return { ...u, classId: undefined };
                if (u.id === classData.teacherId) return { ...u, classId: id };
                return u;
              })
            : s.users,
      }));
    },

    deleteClass: async (id) => {
      await deleteClassDb({ data: { id } });
      setState((s) => ({
        ...s,
        classes: s.classes.filter((cls) => cls.id !== id),
        users: s.users.map((u) => (u.classId === id ? { ...u, classId: undefined } : u)),
      }));
    },

    subjects: state.subjects,

    addSubject: async (data) => {
      if (!currentUser) return;
      const newSubj = await addSubjectDb({
        data: { ...data, actorId: currentUser.id, actorName: currentUser.name },
      });
      setState((s) => ({
        ...s,
        subjects: [...s.subjects, newSubj],
      }));
    },

    addSubjectsBulk: async (data) => {
      if (!currentUser) return;
      await addSubjectsBulkDb({
        data: { ...data, actorId: currentUser.id, actorName: currentUser.name },
      });
      await refreshData();
    },

    updateSubject: async (id, name, code) => {
      if (!currentUser) return;
      await updateSubjectDb({
        data: { id, name, code, actorId: currentUser.id, actorName: currentUser.name },
      });
      setState((s) => ({
        ...s,
        subjects: s.subjects.map((sub) =>
          sub.id === id ? { ...sub, name, code: code || undefined } : sub,
        ),
      }));
    },

    deleteSubject: async (id) => {
      if (!currentUser) return;
      await deleteSubjectDb({
        data: { id, actorId: currentUser.id, actorName: currentUser.name },
      });
      setState((s) => ({
        ...s,
        subjects: s.subjects.filter((sub) => sub.id !== id),
      }));
    },

    seedDefaultSubjects: async (schoolId) => {
      if (!currentUser) return;
      await seedDefaultSubjectsDb({
        data: { schoolId, actorId: currentUser.id, actorName: currentUser.name },
      });
      await refreshData();
    },

    getSchoolSubjects: (targetSchoolId?: string) => {
      const effectiveSchoolId = targetSchoolId || state.selectedSchoolId || currentUser?.schoolId;
      const subjectsList = state.subjects || [];
      const schoolSubjects = effectiveSchoolId
        ? subjectsList.filter((s) => s && s.schoolId === effectiveSchoolId)
        : subjectsList;

      if (schoolSubjects.length > 0) {
        return schoolSubjects;
      }

      const defaultList = [
        { name: "Mathematics", code: "MTH" },
        { name: "English", code: "ENG" },
        { name: "Science", code: "SCI" },
        { name: "Social Studies", code: "SST" },
        { name: "Reading", code: "RDG" },
        { name: "Writing", code: "WRT" },
        { name: "Art & Craft", code: "ART" },
        { name: "Music", code: "MUS" },
        { name: "Physical Education", code: "PE" },
        { name: "Luganda", code: "LUG" },
        { name: "Religious Education", code: "RE" },
      ];
      return defaultList.map((item, idx) => ({
        id: `default_${idx}_${item.name.toLowerCase()}`,
        schoolId: effectiveSchoolId || "default",
        name: item.name,
        code: item.code,
      }));
    },

    refreshData,
    isLocked,
    lock,
    unlock,
    idleTimeoutMs: idleTimeoutMsRef.current,
  };

  // ── Error State ─────────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm w-full text-center space-y-6">
          {/* Animated icon — orange for paused, red for other errors */}
          <div className="relative mx-auto w-fit">
            {isPausedError && (
              <div
                className="absolute inset-0 rounded-3xl bg-orange-400/20 animate-ping"
                style={{ animationDuration: "2s" }}
              />
            )}
            <div
              className={`relative h-20 w-20 rounded-3xl flex items-center justify-center mx-auto ${
                isPausedError ? "bg-orange-100 dark:bg-orange-900/30" : "bg-destructive/10"
              }`}
            >
              {isPausedError ? (
                /* Moon / sleep icon for paused */
                <svg
                  className="h-10 w-10 text-orange-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
                  />
                </svg>
              ) : (
                /* Alert icon for generic errors */
                <svg
                  className="h-10 w-10 text-destructive"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                  />
                </svg>
              )}
            </div>
          </div>

          {/* Title + message */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {isPausedError
                ? "Database is sleeping"
                : isPoolExhaustedError
                  ? "Database busy"
                  : "Connection failed"}
            </h2>
            {isPausedError ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your Supabase free-tier project has <strong>paused due to inactivity</strong>. Go
                  to your dashboard, click <strong>Restore Project</strong>, then wait ~2 minutes.
                </p>
                {/* Step-by-step */}
                <ol className="text-left text-xs text-muted-foreground space-y-1.5 bg-muted/40 rounded-xl p-4">
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 h-5 w-5 rounded-full bg-orange-500/15 text-orange-600 text-[10px] font-bold flex items-center justify-center mt-0.5">
                      1
                    </span>
                    Open <strong>Supabase Dashboard</strong> below
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 h-5 w-5 rounded-full bg-orange-500/15 text-orange-600 text-[10px] font-bold flex items-center justify-center mt-0.5">
                      2
                    </span>
                    Select your project → click <strong>Restore Project</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 h-5 w-5 rounded-full bg-orange-500/15 text-orange-600 text-[10px] font-bold flex items-center justify-center mt-0.5">
                      3
                    </span>
                    Wait ~2 minutes — this page will <strong>retry automatically</strong>
                  </li>
                </ol>
              </div>
            ) : isPoolExhaustedError ? (
              <p className="text-sm text-muted-foreground leading-relaxed">
                The database connection pool is currently busy with high traffic. Reconnecting automatically when connections free up...
              </p>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                Could not reach the database. Check your connection and try again.
              </p>
            )}
          </div>

          {/* Auto-retry countdown bar */}
          {(isPausedError || isPoolExhaustedError) && retryIn > 0 && (
            <div className="space-y-2">
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-orange-400 rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${(retryIn / (isPoolExhaustedError ? 10 : 15)) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Auto-retrying in <span className="font-semibold text-orange-500">{retryIn}s</span>…
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={attemptLoad}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
              Retry now
            </button>
            <a
              href="https://supabase.com/dashboard/project/pgrrciygduxivztddomk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-input bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
              Open Dashboard
            </a>
          </div>

          <p className="text-[11px] text-muted-foreground/70">
            Free tier pauses after 7 days of inactivity. Upgrade to Pro to prevent this.
          </p>
        </div>
      </div>
    );
  }

  // ── Loading State ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          {/* Animated brand mark */}
          <div className="relative">
            {/* Outer pulsing ring */}
            <div
              className="absolute inset-0 rounded-2xl bg-primary/20 animate-ping"
              style={{ animationDuration: "1.5s" }}
            />
            {/* Middle ring */}
            <div className="absolute -inset-2 rounded-[20px] bg-primary/10 animate-pulse" />
            {/* Icon container */}
            <div className="relative h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <svg
                className="h-8 w-8 text-primary-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5"
                />
              </svg>
            </div>
          </div>

          {/* Text */}
          <div className="text-center space-y-1">
            <p className="text-base font-semibold text-foreground">Noble Edu</p>
            <p className="text-sm text-muted-foreground animate-pulse">Connecting to database…</p>
          </div>

          {/* Dots loader */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-2 w-2 rounded-full bg-primary/60 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
