// Mock data for development when database is not available
import type {
  School,
  User,
  Pupil,
  Parent,
  ClassRoom,
  Attendance,
  Notification,
  AuditLog,
  Mark,
  Subject,
  Fee,
} from "./db-functions";

export const mockSchools: School[] = [
  {
    id: "school-1",
    name: "Little Stars Primary School",
    address: "123 Education Street, Learning City",
    phone: "+256-700-123456",
    email: "info@littlestars.edu",
    registeredAt: "2024-01-01",
  },
];

export const mockUsers: User[] = [
  {
    id: "admin-1",
    name: "Admin User",
    email: "admin@littlestars.edu",
    role: "admin",
    status: "verified",
    phone: "+256-700-111111",
    registeredAt: "2024-01-01",
    schoolId: "school-1",
  },
  {
    id: "teacher-1",
    name: "John Teacher",
    email: "john@littlestars.edu",
    role: "teacher",
    status: "verified",
    phone: "+256-700-222222",
    registeredAt: "2024-01-02",
    schoolId: "school-1",
    classId: "class-1",
    subjects: ["Mathematics", "Science"],
  },
];

export const mockSubjects: Subject[] = [
  {
    id: "subj-1",
    schoolId: "school-1",
    name: "Mathematics",
    code: "MATH",
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "subj-2",
    schoolId: "school-1",
    name: "English",
    code: "ENG",
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "subj-3",
    schoolId: "school-1",
    name: "Science",
    code: "SCI",
    createdAt: "2024-01-01T00:00:00Z",
  },
];

export const mockClasses: ClassRoom[] = [
  {
    id: "class-1",
    name: "Primary 1",
    teacherId: "teacher-1",
    schoolId: "school-1",
    subjects: ["Mathematics", "English", "Science"],
  },
  {
    id: "class-2",
    name: "Primary 2",
    schoolId: "school-1",
    subjects: ["Mathematics", "English", "Science"],
  },
];

export const mockParents: Parent[] = [
  {
    id: "parent-1",
    name: "Mary Parent",
    phone: "+256-700-333333",
    email: "mary@example.com",
    relationship: "Mother",
    schoolId: "school-1",
  },
  {
    id: "parent-2",
    name: "John Parent",
    phone: "+256-700-444444",
    email: "john@example.com",
    relationship: "Father",
    schoolId: "school-1",
  },
];

export const mockPupils: Pupil[] = [
  {
    id: "pupil-1",
    admissionNo: "LS2024001",
    firstName: "Alice",
    lastName: "Student",
    gender: "F",
    dob: "2018-05-15",
    classId: "class-1",
    active: true,
    parentIds: ["parent-1"],
    schoolId: "school-1",
  },
  {
    id: "pupil-2",
    admissionNo: "LS2024002",
    firstName: "Bob",
    lastName: "Learner",
    gender: "M",
    dob: "2018-08-20",
    classId: "class-1",
    active: true,
    parentIds: ["parent-2"],
    schoolId: "school-1",
  },
];

export const mockAttendance: Attendance[] = [
  {
    id: "att-1",
    pupilId: "pupil-1",
    date: new Date().toISOString().slice(0, 10),
    arrival: "08:00",
    arrivalTransport: "School Bus",
    arrivalPersonName: "Mary Parent",
    arrivalPersonRelation: "Mother",
  },
];

export const mockNotifications: Notification[] = [
  {
    id: "notif-1",
    pupilId: "pupil-1",
    parentId: "parent-1",
    channel: "sms",
    type: "arrival",
    status: "sent",
    message: "Alice Student has arrived safely at school",
    timestamp: new Date().toISOString(),
    phoneNumber: "+256-700-333333",
  },
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: "audit-1",
    actorId: "admin-1",
    actorName: "Admin User",
    action: "Created pupil",
    target: "Alice Student",
    timestamp: new Date().toISOString(),
  },
];

export const mockMarks: Mark[] = [
  {
    id: "mark-1",
    pupilId: "pupil-1",
    subject: "Mathematics",
    term: "Term 1",
    year: "2024",
    score: 85,
    maxScore: 100,
    grade: "A",
    teacherComment: "Excellent work!",
    recordedBy: "teacher-1",
    recordedAt: new Date().toISOString(),
  },
];

export const mockFees: Fee[] = [
  {
    id: "fee-1",
    pupilId: "pupil-1",
    schoolId: "school-1",
    description: "Tuition Fee - Term 1",
    term: "Term 1",
    year: "2024",
    amountDue: 500000,
    amountPaid: 300000,
    dueDate: "2024-03-31",
    createdBy: "admin-1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

export const mockData = {
  schools: mockSchools,
  users: mockUsers,
  classes: mockClasses,
  parents: mockParents,
  pupils: mockPupils,
  attendance: mockAttendance,
  notifications: mockNotifications,
  audit: mockAuditLogs,
  marks: mockMarks,
  subjects: mockSubjects,
  fees: mockFees,
};
