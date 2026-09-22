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
  // Super admin (matches README default)
  {
    id: "admin",
    name: "System Administrator",
    email: "admin@littlestars.edu",
    role: "super_admin",
    status: "verified",
    phone: "+256-700-000000",
    registeredAt: "2024-01-01",
    password: "admin123", // Default password for mock mode
  },
  // School admin
  {
    id: "admin-1",
    name: "School Admin",
    email: "schooladmin@littlestars.edu",
    role: "admin",
    status: "verified",
    phone: "+256-700-111111",
    registeredAt: "2024-01-01",
    schoolId: "school-1",
  },
  // Teacher
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
  // Deputy head teacher
  {
    id: "deputy-1",
    name: "Jane Deputy",
    email: "jane@littlestars.edu",
    role: "deputy",
    status: "verified",
    phone: "+256-700-333333",
    registeredAt: "2024-01-02",
    schoolId: "school-1",
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
  {
    id: "pupil-3",
    admissionNo: "LS2024003",
    firstName: "Emma",
    lastName: "Wilson",
    gender: "F",
    dob: "2019-03-10",
    classId: "class-2",
    active: true,
    parentIds: ["parent-1"],
    schoolId: "school-1",
  },
  {
    id: "pupil-4",
    admissionNo: "LS2024004",
    firstName: "James",
    lastName: "Brown",
    gender: "M",
    dob: "2017-12-05",
    classId: "class-1",
    active: false,
    parentIds: ["parent-2"],
    schoolId: "school-1",
  },
  {
    id: "pupil-5",
    admissionNo: "LS2024005",
    firstName: "Sophie",
    lastName: "Davis",
    gender: "F",
    dob: "2019-07-22",
    classId: "class-2",
    active: true,
    parentIds: ["parent-1", "parent-2"],
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
    arrivalPhone: "+256-700-333333",
  },
  {
    id: "att-2",
    pupilId: "pupil-2",
    date: new Date().toISOString().slice(0, 10),
    arrival: "08:15",
    departure: "15:30",
    arrivalTransport: "Car",
    departureTransport: "Car",
    arrivalPersonName: "John Parent",
    arrivalPersonRelation: "Father",
    arrivalPhone: "+256-700-444444",
    departurePersonName: "John Parent",
    departurePersonRelation: "Father",
    departurePhone: "+256-700-444444",
  },
  {
    id: "att-3",
    pupilId: "pupil-3",
    date: new Date().toISOString().slice(0, 10),
    arrival: "07:45",
    arrivalTransport: "Walking",
    arrivalPersonName: "Mary Parent",
    arrivalPersonRelation: "Mother",
    arrivalPhone: "+256-700-333333",
  },
  // Previous days for demonstration
  {
    id: "att-4",
    pupilId: "pupil-1",
    date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), // Yesterday
    arrival: "08:10",
    departure: "15:00",
    arrivalTransport: "School Bus",
    departureTransport: "School Bus",
    arrivalPersonName: "Mary Parent",
    arrivalPersonRelation: "Mother",
  },
  {
    id: "att-5",
    pupilId: "pupil-2",
    date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), // Yesterday
    arrival: "08:05",
    departure: "15:15",
    arrivalTransport: "Car",
    departureTransport: "Car",
    arrivalPersonName: "John Parent",
    arrivalPersonRelation: "Father",
  },
  // Day before yesterday - pupil-4 has poor attendance
  {
    id: "att-6",
    pupilId: "pupil-1",
    date: new Date(Date.now() - 172800000).toISOString().slice(0, 10), // Day before yesterday
    arrival: "08:20",
    arrivalTransport: "Car",
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
    description: "Tuition Fee",
    term: "Term 1",
    year: "2024",
    amountDue: 500000,
    amountPaid: 300000,
    dueDate: "2024-03-31",
    createdBy: "admin-1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    notes: "Payment: 300000 (Bank Transfer) on Jan 15, 2024",
  },
  {
    id: "fee-2",
    pupilId: "pupil-2",
    schoolId: "school-1",
    description: "Transport Fee",
    term: "Term 1",
    year: "2024",
    amountDue: 150000,
    amountPaid: 150000,
    dueDate: "2024-03-31",
    createdBy: "admin-1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    notes: "Payment: 150000 (Mobile Money) on Feb 1, 2024",
  },
  {
    id: "fee-3",
    pupilId: "pupil-3",
    schoolId: "school-1",
    description: "Meal Fee",
    term: "Term 1",
    year: "2024",
    amountDue: 80000,
    amountPaid: 0,
    dueDate: "2024-04-15",
    createdBy: "admin-1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "fee-4",
    pupilId: "pupil-4",
    schoolId: "school-1",
    description: "Tuition Fee",
    term: "Term 1",
    year: "2024",
    amountDue: 500000,
    amountPaid: 100000,
    dueDate: "2024-02-28", // Overdue
    createdBy: "admin-1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    notes: "Payment: 100000 (Cash) on Feb 10, 2024",
  },
  {
    id: "fee-5",
    pupilId: "pupil-5",
    schoolId: "school-1",
    description: "Activity Fee",
    term: "Term 1",
    year: "2024",
    amountDue: 50000,
    amountPaid: 50000,
    dueDate: "2024-03-15",
    createdBy: "admin-1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    notes: "Payment: 50000 (Card Payment) on Mar 1, 2024",
  },
  {
    id: "fee-6",
    pupilId: "pupil-1",
    schoolId: "school-1",
    description: "Books & Materials",
    term: "Term 2",
    year: "2024",
    amountDue: 120000,
    amountPaid: 0,
    dueDate: "2024-07-31",
    createdBy: "admin-1",
    createdAt: "2024-05-01T00:00:00Z",
    updatedAt: "2024-05-01T00:00:00Z",
  },
  // Severely overdue example (more than 30 days)
  {
    id: "fee-7",
    pupilId: "pupil-4",
    schoolId: "school-1",
    description: "Transport Fee",
    term: "Term 1",
    year: "2024",
    amountDue: 150000,
    amountPaid: 0,
    dueDate: "2024-01-31", // Very overdue
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
