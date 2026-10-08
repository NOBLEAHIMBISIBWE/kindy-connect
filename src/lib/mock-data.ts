import {
  School,
  User,
  Student,
  Parent,
  ClassRoom,
  Attendance,
  Notification,
  AuditLog,
  Mark,
  Fee,
  Subject,
} from "./db-functions";

export const mockSchools: School[] = [
  {
    id: "s-1",
    name: "Noble International School",
    address: "Kampala, Uganda",
    phone: "0786951347",
    email: "info@nobleschool.edu",
    registeredAt: "2025-01-01",
  },
];

export const mockUsers: User[] = [
  {
    id: "admin",
    name: "System Admin",
    email: "admin@nobleschool.edu",
    role: "super_admin",
    status: "verified",
    phone: "0786951347",
    registeredAt: "2025-01-01",
    schoolId: "s-1",
  },
];

export const mockStudents: Student[] = [];
export const mockParents: Parent[] = [];
export const mockClasses: ClassRoom[] = [];
export const mockAttendance: Attendance[] = [];
export const mockNotifications: Notification[] = [];
export const mockAuditLogs: AuditLog[] = [];
export const mockMarks: Mark[] = [];
export const mockFees: Fee[] = [];
export const mockSubjects: Subject[] = [];
