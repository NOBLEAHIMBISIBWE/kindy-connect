// @ts-nocheck
import bcrypt from "bcrypt";
import { createServerFn } from "@tanstack/react-start";
import { sql, setRLSContext, toCamel, toSnake } from "./db";
import { serverCache } from "./cache";

type SqlClient = typeof sql;

// Helper to check if database is available
function isDatabaseAvailable(): boolean {
  return sql !== null;
}

// Helper to throw error when database is required but not available
function requireDatabase(): typeof sql {
  if (!sql) {
    throw new Error("Database operation not available - no database connection configured");
  }
  return sql;
}

export interface School {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  registeredAt: string;
}

export interface Subject {
  id: string;
  schoolId: string;
  name: string;
  code?: string;
  createdAt?: string;
}

// Type aliases used across the app
export type Role = "super_admin" | "admin" | "deputy" | "teacher";
export type TeacherStatus = "pending" | "verified" | "rejected";

// Types matching frontend
export interface User {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "admin" | "deputy" | "teacher";
  status: "pending" | "verified" | "rejected";
  phone?: string;
  classId?: string;
  registeredAt: string;
  password?: string;
  schoolId?: string;
  subjects?: string[];
  photo?: string;
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
  schoolId: string;
}

export interface ParentInput {
  name: string;
  phone: string;
  email: string;
  relationship: string;
}

export interface Parent {
  id: string;
  name: string;
  phone: string;
  email: string;
  relationship: string;
  schoolId: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  teacherId?: string;
  schoolId: string;
  subjects?: string[];
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

export interface Fee {
  id: string;
  pupilId: string;
  schoolId: string;
  description: string;
  term: string;
  year: string;
  amountDue: number;
  amountPaid: number;
  dueDate?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Helper for safe audit log insertion (prevents FK violation if actorId is not in users table)
async function safeInsertAuditLog(
  tx: any,
  logId: string,
  actorId: string,
  actorName: string,
  action: string,
  target: string,
) {
  let validActorId = actorId;
  const userCheck = await tx`SELECT id FROM users WHERE id = ${actorId}`;
  if (userCheck.length === 0) {
    const defaultUser = await tx`SELECT id FROM users LIMIT 1`;
    if (defaultUser.length > 0) {
      validActorId = defaultUser[0].id;
    }
  }
  await tx`
    INSERT INTO audit_logs (id, actor_id, actor_name, action, target, timestamp)
    VALUES (${logId}, ${validActorId}, ${actorName}, ${action}, ${target}, CURRENT_TIMESTAMP)
  `;
}

// ----------------------------------------------------
// 1. Get Initial Data
// ----------------------------------------------------
export const getInitialData = createServerFn({ method: "GET" })
  .inputValidator((d: { userId?: string } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    // Check if we should use mock data (development mode)
    if (!sql) {
      const { mockData } = await import("./mock-data");
      console.log("📝 Using mock data for development (no database connection)");
      return mockData;
    }

    const fetchInitialData = async (client: typeof sql) => {
      // ─── Run ALL queries in parallel ────────────────────────────────────────
      // Previously sequential (8 awaits in a row). Now concurrent: total time =
      // max(individual query times) instead of sum(individual query times).
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const cutoffDate = ninetyDaysAgo.toISOString().slice(0, 10);

      // Optional tables (fees and subjects) query the root sql client so that if they
      // do not exist in an unmigrated database, catching error 42P01 does not abort transaction tx.
      const feesQuery =
        sql`SELECT * FROM fees ORDER BY due_date ASC NULLS LAST, created_at DESC`.catch(
          (error: any) => {
            if (
              error?.code === "42P01" ||
              error?.message?.includes('relation "fees" does not exist') ||
              error?.message?.includes("does not exist") ||
              error?.message?.includes("42P01")
            ) {
              console.warn("Fees table does not exist yet; returning an empty fee list.");
              return [];
            }
            throw error;
          },
        );

      const subjectsQuery = sql`SELECT * FROM subjects ORDER BY name ASC`.catch((error: any) => {
        if (
          error?.code === "42P01" ||
          error?.message?.includes('relation "subjects" does not exist') ||
          error?.message?.includes("does not exist") ||
          error?.message?.includes("42P01")
        ) {
          console.warn("Subjects table does not exist yet; returning an empty subject list.");
          return [];
        }
        throw error;
      });

      const [
        schools,
        users,
        classes,
        parents,
        pupilsRaw,
        pupilParents,
        attendance,
        notifications,
        audit,
        marks,
        subjects,
        fees,
      ] = await Promise.all([
        client`SELECT * FROM schools ORDER BY name ASC`,
        client`SELECT * FROM users ORDER BY registered_at DESC`,
        client`SELECT * FROM classes ORDER BY name ASC`,
        client`SELECT * FROM parents ORDER BY name ASC`,
        client`SELECT * FROM pupils ORDER BY first_name ASC, last_name ASC`,
        client`SELECT * FROM pupil_parents`,
        client`SELECT * FROM attendance WHERE date >= ${cutoffDate} ORDER BY date DESC, arrival DESC`,
        client`SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 200`,
        client`SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200`,
        client`SELECT * FROM marks ORDER BY recorded_at DESC LIMIT 2000`,
        subjectsQuery,
        feesQuery,
      ]);

      const parentMap: Record<string, string[]> = {};
      for (const link of pupilParents as any[]) {
        if (!parentMap[link.pupil_id]) {
          parentMap[link.pupil_id] = [];
        }
        if (link.parent_id) {
          parentMap[link.pupil_id].push(link.parent_id);
        }
      }

      const pupils = toCamel<Pupil[]>(pupilsRaw).map((p) => ({
        ...p,
        parentIds: parentMap[p.id] || [],
      }));

      const parsedFees = toCamel<Fee[]>(fees).map((f) => ({
        ...f,
        amountDue: Number(f.amountDue || 0),
        amountPaid: Number(f.amountPaid || 0),
      }));

      return {
        schools: toCamel<School[]>(schools),
        users: toCamel<User[]>(users),
        classes: toCamel<ClassRoom[]>(classes),
        parents: toCamel<Parent[]>(parents),
        pupils,
        attendance: toCamel<Attendance[]>(attendance),
        notifications: toCamel<Notification[]>(notifications),
        audit: toCamel<AuditLog[]>(audit),
        marks: toCamel<Mark[]>(marks),
        subjects: toCamel<Subject[]>(subjects),
        fees: parsedFees,
      };
    };

    try {
      const cacheKey = `initial_data_${data?.userId || "all"}`;
      const cacheTags = [
        "schools",
        "users",
        "classes",
        "parents",
        "pupils",
        "attendance",
        "notifications",
        "audit",
        "marks",
        "subjects",
        "fees",
      ];

      return await serverCache.cachedFetch(cacheKey, 60, cacheTags, async () => {
        if (data?.userId) {
          try {
            return await sql.begin(async (tx) => {
              await setRLSContext(tx, data.userId!);
              return fetchInitialData(tx as unknown as SqlClient);
            });
          } catch (rlsErr) {
            console.warn(
              "Failed to set RLS context for userId in getInitialData, falling back to uncontextualized query:",
              rlsErr,
            );
            return await fetchInitialData(sql);
          }
        }
        return await fetchInitialData(sql);
      });
    } catch (error: any) {
      console.error("Error in getInitialData server function:", error);
      return {
        schools: [],
        users: [],
        classes: [],
        parents: [],
        pupils: [],
        attendance: [],
        notifications: [],
        audit: [],
        marks: [],
        subjects: [],
        fees: [],
        error: error?.message || "Failed to query database",
      };
    }
  });

// ----------------------------------------------------
// 2. Authentication Functions
// ----------------------------------------------------
export const loginUser = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; password: string }) => d)
  .handler(async ({ data }) => {
    const db = requireDatabase();
    const { id, password } = data;
    try {
      const results = await db`
        SELECT * FROM users 
        WHERE LOWER(id) = LOWER(${id.trim()})
      `;
      if (results.length === 0) return null;
      const dbUserRecord = results[0];
      const user = toCamel<User>(dbUserRecord);

      let isValidPassword = false;
      if (user.password) {
        if (
          user.password.startsWith("$2b$") ||
          user.password.startsWith("$2a$") ||
          user.password.startsWith("$2y$")
        ) {
          isValidPassword = await bcrypt.compare(password, user.password);
        } else {
          // Legacy plain text password check
          isValidPassword = user.password === password;
          if (isValidPassword) {
            // Auto-migrate legacy plain text password to bcrypt hash
            try {
              const hashedPassword = await bcrypt.hash(password, 10);
              await sql`UPDATE users SET password = ${hashedPassword} WHERE id = ${user.id}`;
              user.password = hashedPassword;
            } catch (hashErr) {
              console.error("Failed to migrate plain text password to hash:", hashErr);
            }
          }
        }
      }

      if (!isValidPassword) return null;
      if (user.role === "teacher" && user.status !== "verified") return null;
      return user;
    } catch (error) {
      console.error("Error in loginUser:", error);
      throw error;
    }
  });

export const registerUser = createServerFn({ method: "POST" })
  .inputValidator(
    (
      d: Omit<User, "status" | "registeredAt"> & {
        password: string;
        schoolId?: string;
        newSchoolName?: string;
        status?: "pending" | "verified" | "rejected";
        subjects?: string[];
        photo?: string;
        classId?: string;
      },
    ) => d,
  )
  .handler(async ({ data }) => {
    const db = requireDatabase();
    const id = data.id.trim();
    const password = data.password.trim();
    const status = data.status || (data.role === "admin" ? "verified" : "pending");
    const registeredAt = new Date().toISOString().slice(0, 10);

    if (!password) {
      throw new Error("Password is required");
    }

    try {
      // Check for existing ID
      const idCheck = await db`SELECT id FROM users WHERE LOWER(id) = LOWER(${id})`;
      if (idCheck.length > 0) {
        throw new Error("Assigned ID already used");
      }

      // Check for existing email
      const emailCheck = await db`SELECT id FROM users WHERE LOWER(email) = LOWER(${data.email})`;
      if (emailCheck.length > 0) {
        throw new Error("Email already used");
      }

      // Check for existing phone if provided
      if (data.phone) {
        const phoneCheck = await db`SELECT id FROM users WHERE phone = ${data.phone}`;
        if (phoneCheck.length > 0) {
          throw new Error("Phone number already used");
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await db.begin(async (sql) => {
        let finalSchoolId = data.schoolId;
        let newSchool: any = null;

        if (data.schoolId === "new" && data.newSchoolName) {
          const generatedSchoolId = "s-" + Math.random().toString(36).slice(2, 10);
          const dbSchool = toSnake({
            id: generatedSchoolId,
            name: data.newSchoolName,
            registeredAt,
          });
          await sql`INSERT INTO schools ${sql(dbSchool)}`;
          finalSchoolId = generatedSchoolId;
          newSchool = toCamel<School>(dbSchool);
        }

        const dbUser = toSnake({
          id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: data.role,
          status,
          registeredAt,
          password: hashedPassword,
          schoolId: finalSchoolId || null,
          classId: data.classId || null,
          subjects: data.subjects || null,
          photo: data.photo || null,
        });

        await sql`INSERT INTO users ${sql(dbUser)}`;
        serverCache.invalidateTags(["users", "schools"]);
        return {
          user: toCamel<User>(dbUser),
          school: newSchool,
        };
      });
      return result;
    } catch (error: any) {
      console.error("Error in registerUser:", error);
      // Return user-friendly error messages
      if (
        error.message === "Assigned ID already used" ||
        error.message === "Email already used" ||
        error.message === "Phone number already used"
      ) {
        throw error;
      }
      // Check for PostgreSQL unique constraint violations
      if (error.code === "23505") {
        if (
          error.constraint === "users_pkey" ||
          error.message?.includes("id") ||
          error.message?.includes("pkey")
        ) {
          throw new Error("Assigned ID already used");
        }
        if (error.constraint === "users_email_key" || error.message?.includes("email")) {
          throw new Error("Email already used");
        }
        if (error.constraint === "users_phone_key" || error.message?.includes("phone")) {
          throw new Error("Phone number already used");
        }
      }
      throw error;
    }
  });

export const approveTeacher = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; actorId: string; actorName: string }) => d)
  .handler(async ({ data }) => {
    const { id, actorId, actorName } = data;
    const logId = Math.random().toString(36).slice(2, 10);

    try {
      await sql.begin(async (sql) => {
        const users = await sql`
          UPDATE users SET status = 'verified' WHERE id = ${id} RETURNING name
        `;
        if (users.length > 0) {
          const teacherName = users[0].name;
          await safeInsertAuditLog(sql, logId, actorId, actorName, "Approved teacher", teacherName);
        }
      });
      serverCache.invalidateTags(["users", "audit"]);
      return { id };
    } catch (error) {
      console.error("Error in approveTeacher:", error);
      throw error;
    }
  });

export const rejectTeacher = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; actorId: string; actorName: string }) => d)
  .handler(async ({ data }) => {
    const { id, actorId, actorName } = data;
    const logId = Math.random().toString(36).slice(2, 10);

    try {
      await sql.begin(async (sql) => {
        const users = await sql`
          UPDATE users SET status = 'rejected' WHERE id = ${id} RETURNING name
        `;
        if (users.length > 0) {
          const teacherName = users[0].name;
          await safeInsertAuditLog(sql, logId, actorId, actorName, "Rejected teacher", teacherName);
        }
      });
      return { id };
    } catch (error) {
      console.error("Error in rejectTeacher:", error);
      throw error;
    }
  });

// ----------------------------------------------------
// 3. Pupil CRUD Functions
// ----------------------------------------------------
export const addPupil = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      pupil: Omit<Pupil, "id" | "active">;
      parent: ParentInput;
      actorId: string;
      actorName: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const { pupil, parent, actorId, actorName } = data;

    // Server-side validation: parent info is required
    if (!parent.name || !parent.phone || !parent.email || !parent.relationship) {
      throw new Error("Parent / guardian details are required");
    }

    // Server-side duplicate check for admission_no
    const existingAdmission = await sql`
      SELECT id FROM pupils WHERE LOWER(admission_no) = LOWER(${pupil.admissionNo.trim()})
    `;
    if (existingAdmission.length > 0) {
      throw new Error(`Admission number '${pupil.admissionNo}' already exists`);
    }

    const id = Math.random().toString(36).slice(2, 10);
    const logId = Math.random().toString(36).slice(2, 10);
    const parentId = Math.random().toString(36).slice(2, 10);

    const dbPupil = toSnake({
      id,
      admissionNo: pupil.admissionNo.trim(),
      firstName: pupil.firstName.trim(),
      lastName: pupil.lastName.trim(),
      gender: pupil.gender,
      dob: pupil.dob,
      classId: pupil.classId,
      photo: pupil.photo,
      active: true,
      schoolId: pupil.schoolId,
    });

    try {
      await sql.begin(async (sql) => {
        await sql`INSERT INTO parents ${sql(toSnake({ id: parentId, ...parent, schoolId: pupil.schoolId }))}`;

        await sql`INSERT INTO pupils ${sql(dbPupil)}`;

        await sql`INSERT INTO pupil_parents ${sql([{ pupil_id: id, parent_id: parentId }], "pupil_id", "parent_id")}`;

        if (pupil.parentIds && pupil.parentIds.length > 0) {
          const rows = pupil.parentIds.map((pid) => ({
            pupil_id: id,
            parent_id: pid,
          }));
          await sql`INSERT INTO pupil_parents ${sql(rows, "pupil_id", "parent_id")}`;
        }

        const targetDesc = `${pupil.firstName} ${pupil.lastName} (${pupil.admissionNo})`;
        await safeInsertAuditLog(sql, logId, actorId, actorName, "Created pupil", targetDesc);
      });
      serverCache.invalidateTags(["pupils", "parents", "audit"]);

      return {
        id,
        ...pupil,
        active: true,
        parentIds: [parentId, ...(pupil.parentIds || [])],
      };
    } catch (error: any) {
      console.error("Error in addPupil:", error);
      if (
        error.code === "23505" ||
        error.message?.includes("admission_no") ||
        error.message?.includes("pupils_pkey")
      ) {
        throw new Error(`Admission number '${pupil.admissionNo}' already exists`);
      }
      throw error;
    }
  });

// Bulk add pupils with their parents
export const bulkAddPupils = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      pupils: Array<{ pupil: Omit<Pupil, "id" | "active">; parent: ParentInput }>;
      actorId: string;
      actorName: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const { pupils, actorId, actorName } = data;

    if (!pupils || pupils.length === 0) {
      throw new Error("No pupils provided for bulk upload");
    }

    const results: Array<{
      success: boolean;
      pupilId?: string;
      admissionNo: string;
      name: string;
      error?: string;
    }> = [];

    try {
      const schoolId = pupils[0]?.pupil.schoolId || "";
      const existingDbPupils = await sql`
        SELECT LOWER(admission_no) as adm FROM pupils WHERE school_id = ${schoolId}
      `;
      const existingAdmSet = new Set(existingDbPupils.map((p: any) => p.adm));
      const payloadAdmSet = new Set<string>();

      for (const item of pupils) {
        const { pupil, parent } = item;
        const admLower = pupil.admissionNo.trim().toLowerCase();

        if (payloadAdmSet.has(admLower)) {
          results.push({
            success: false,
            admissionNo: pupil.admissionNo,
            name: `${pupil.firstName} ${pupil.lastName}`,
            error: "Duplicate admission number within upload file",
          });
          continue;
        }
        payloadAdmSet.add(admLower);

        if (existingAdmSet.has(admLower)) {
          results.push({
            success: false,
            admissionNo: pupil.admissionNo,
            name: `${pupil.firstName} ${pupil.lastName}`,
            error: "Admission number already exists in system",
          });
          continue;
        }

        const pupilId = Math.random().toString(36).slice(2, 10);
        const parentId = Math.random().toString(36).slice(2, 10);
        const logId = Math.random().toString(36).slice(2, 10);

        try {
          if (!parent.name || !parent.phone || !parent.email || !parent.relationship) {
            throw new Error("Parent details are incomplete");
          }

          await sql.begin(async (tx) => {
            const dbParent = toSnake({
              id: parentId,
              ...parent,
              schoolId: pupil.schoolId,
            });
            await tx`INSERT INTO parents ${tx(dbParent)}`;

            const dbPupil = toSnake({
              id: pupilId,
              admissionNo: pupil.admissionNo.trim(),
              firstName: pupil.firstName.trim(),
              lastName: pupil.lastName.trim(),
              gender: pupil.gender,
              dob: pupil.dob,
              classId: pupil.classId,
              photo: pupil.photo || null,
              active: true,
              schoolId: pupil.schoolId,
            });
            await tx`INSERT INTO pupils ${tx(dbPupil)}`;

            await tx`INSERT INTO pupil_parents ${tx(
              [{ pupil_id: pupilId, parent_id: parentId }],
              "pupil_id",
              "parent_id",
            )}`;

            const targetDesc = `${pupil.firstName} ${pupil.lastName} (${pupil.admissionNo})`;
            await safeInsertAuditLog(
              tx,
              logId,
              actorId,
              actorName,
              "Bulk created pupil",
              targetDesc,
            );
          });

          existingAdmSet.add(admLower);
          results.push({
            success: true,
            pupilId,
            admissionNo: pupil.admissionNo,
            name: `${pupil.firstName} ${pupil.lastName}`,
          });
        } catch (error: any) {
          console.error(`Error adding pupil ${pupil.admissionNo}:`, error);
          results.push({
            success: false,
            admissionNo: pupil.admissionNo,
            name: `${pupil.firstName} ${pupil.lastName}`,
            error: error.message || "Failed to add pupil",
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;
      serverCache.invalidateTags(["pupils", "parents", "audit"]);

      return {
        total: pupils.length,
        successCount,
        failCount,
        results,
      };
    } catch (error) {
      console.error("Error in bulkAddPupils:", error);
      throw error;
    }
  });

export const updatePupil = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; data: Partial<Pupil> }) => d)
  .handler(async ({ data }) => {
    const { id, data: pupilData } = data;

    // Separate parentIds since it's junction table, other fields are in pupils table
    const { parentIds, ...directFields } = pupilData;
    const dbFields = toSnake(directFields);

    try {
      await sql.begin(async (sql) => {
        if (Object.keys(dbFields).length > 0) {
          await sql`
            UPDATE pupils SET ${sql(dbFields)} WHERE id = ${id}
          `;
        }

        if (parentIds !== undefined) {
          await sql`DELETE FROM pupil_parents WHERE pupil_id = ${id}`;
          if (parentIds.length > 0) {
            const rows = parentIds.map((parentId) => ({
              pupil_id: id,
              parent_id: parentId,
            }));
            await sql`INSERT INTO pupil_parents ${sql(rows, "pupil_id", "parent_id")}`;
          }
        }
      });
      serverCache.invalidateTags(["pupils", "parents", "audit"]);
      return { id, data: pupilData };
    } catch (error) {
      console.error("Error in updatePupil:", error);
      throw error;
    }
  });

export const deactivatePupil = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    try {
      await sql`
        UPDATE pupils SET active = false WHERE id = ${data.id}
      `;
      serverCache.invalidateTags(["pupils", "audit"]);
      return { id: data.id };
    } catch (error) {
      console.error("Error in deactivatePupil:", error);
      throw error;
    }
  });

// ----------------------------------------------------
// 4. Parent Functions
// ----------------------------------------------------
export const addParent = createServerFn({ method: "POST" })
  .inputValidator((d: { parent: Omit<Parent, "id">; actorId: string; actorName: string }) => d)
  .handler(async ({ data }) => {
    const { parent, actorId, actorName } = data;

    // Duplicate check for phone number within school
    const existingPhone = await sql`
      SELECT id FROM parents WHERE school_id = ${parent.schoolId} AND phone = ${parent.phone.trim()}
    `;
    if (existingPhone.length > 0) {
      throw new Error(`A parent with phone number '${parent.phone}' already exists in this school`);
    }

    const id = Math.random().toString(36).slice(2, 10);
    const logId = Math.random().toString(36).slice(2, 10);

    const dbParent = toSnake({
      id,
      ...parent,
      phone: parent.phone.trim(),
      email: parent.email.trim(),
      name: parent.name.trim(),
    });

    try {
      await sql.begin(async (sql) => {
        await sql`INSERT INTO parents ${sql(dbParent)}`;
        await safeInsertAuditLog(sql, logId, actorId, actorName, "Registered parent", parent.name);
      });
      serverCache.invalidateTags(["parents", "audit"]);

      return { id, ...parent };
    } catch (error: any) {
      console.error("Error in addParent:", error);
      if (error.code === "23505" || error.message?.includes("unq_parents_school_phone")) {
        throw new Error(
          `A parent with phone number '${parent.phone}' already exists in this school`,
        );
      }
      throw error;
    }
  });

// ----------------------------------------------------
// 5. Attendance & Notifications Functions
// ----------------------------------------------------
export const markArrival = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      pupilId: string;
      transportDetails: {
        transport: string;
        vehicleReg?: string;
        personName: string;
        personRelation: string;
        phone?: string;
      };
      actorId: string;
      actorName: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const { pupilId, transportDetails, actorId, actorName } = data;
    const date = new Date().toISOString().slice(0, 10);
    const time = new Date().toTimeString().slice(0, 5);
    const attendanceId = Math.random().toString(36).slice(2, 10);
    const logId = Math.random().toString(36).slice(2, 10);

    try {
      const result = await sql.begin(async (sql) => {
        // Fetch pupil details
        const pupils = await sql`SELECT first_name, last_name FROM pupils WHERE id = ${pupilId}`;
        if (pupils.length === 0) throw new Error("Pupil not found");
        const pupil = pupils[0];

        // Check if attendance already exists for today
        const existing =
          await sql`SELECT id FROM attendance WHERE pupil_id = ${pupilId} AND date = ${date}`;
        let updatedAtt: any;

        if (existing.length > 0) {
          // Update existing
          const rows = await sql`
            UPDATE attendance SET 
              arrival = ${time},
              arrival_transport = ${transportDetails.transport},
              arrival_vehicle_reg = ${transportDetails.vehicleReg || null},
              arrival_person_name = ${transportDetails.personName},
              arrival_person_relation = ${transportDetails.personRelation},
              arrival_phone = ${transportDetails.phone || null}
            WHERE id = ${existing[0].id}
            RETURNING *
          `;
          updatedAtt = rows[0];
        } else {
          // Insert new
          const rows = await sql`
            INSERT INTO attendance (
              id, pupil_id, date, arrival, 
              arrival_transport, arrival_vehicle_reg, arrival_person_name, arrival_person_relation, arrival_phone
            ) VALUES (
              ${attendanceId}, ${pupilId}, ${date}, ${time},
              ${transportDetails.transport}, ${transportDetails.vehicleReg || null}, ${transportDetails.personName}, ${transportDetails.personRelation}, ${transportDetails.phone || null}
            )
            RETURNING *
          `;
          updatedAtt = rows[0];
        }

        // Fetch mapped parents to send notifications
        const parents = await sql`
          SELECT p.* FROM parents p
          JOIN pupil_parents pp ON p.id = pp.parent_id
          WHERE pp.pupil_id = ${pupilId}
        `;

        const addedNotifications: any[] = [];

        for (const parent of parents) {
          const msg = `Dear ${parent.name}, your child ${pupil.first_name} ${pupil.last_name} arrived safely at school today at ${time} via ${transportDetails.transport} brought by ${transportDetails.personName} (${transportDetails.personRelation}).`;
          const smsId = Math.random().toString(36).slice(2, 10);
          const emailId = Math.random().toString(36).slice(2, 10);

          // Insert SMS notification record
          await sql`
            INSERT INTO notifications (id, pupil_id, parent_id, channel, type, status, message, timestamp, phone_number)
            VALUES (${smsId}, ${pupilId}, ${parent.id}, 'sms', 'arrival', 'sent', ${msg}, CURRENT_TIMESTAMP, ${parent.phone})
          `;

          // Insert Email notification record
          await sql`
            INSERT INTO notifications (id, pupil_id, parent_id, channel, type, status, message, timestamp, phone_number)
            VALUES (${emailId}, ${pupilId}, ${parent.id}, 'email', 'arrival', 'sent', ${msg}, CURRENT_TIMESTAMP, ${parent.phone})
          `;

          addedNotifications.push(
            {
              id: smsId,
              pupilId,
              parentId: parent.id,
              channel: "sms",
              type: "arrival",
              status: "sent",
              message: msg,
              timestamp: new Date().toISOString(),
              phoneNumber: parent.phone,
            },
            {
              id: emailId,
              pupilId,
              parentId: parent.id,
              channel: "email",
              type: "arrival",
              status: "sent",
              message: msg,
              timestamp: new Date().toISOString(),
              phoneNumber: parent.phone,
            },
          );
        }

        // Log action
        const targetDesc = `${pupil.first_name} ${pupil.last_name}`;
        await safeInsertAuditLog(sql, logId, actorId, actorName, "Marked arrival", targetDesc);

        const addedAudit = {
          id: logId,
          actorId,
          actorName,
          action: "Marked arrival",
          target: targetDesc,
          timestamp: new Date().toISOString(),
        };

        return {
          attendance: toCamel<Attendance>(updatedAtt),
          notifications: addedNotifications,
          audit: addedAudit,
        };
      });
      serverCache.invalidateTags(["attendance", "notifications", "audit"]);

      return result;
    } catch (error) {
      console.error("Error in markArrival:", error);
      throw error;
    }
  });

export const markDeparture = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      pupilId: string;
      transportDetails: {
        transport: string;
        vehicleReg?: string;
        personName: string;
        personRelation: string;
        phone?: string;
      };
      actorId: string;
      actorName: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const { pupilId, transportDetails, actorId, actorName } = data;
    const date = new Date().toISOString().slice(0, 10);
    const time = new Date().toTimeString().slice(0, 5);
    const attendanceId = Math.random().toString(36).slice(2, 10);
    const logId = Math.random().toString(36).slice(2, 10);

    try {
      const result = await sql.begin(async (sql) => {
        // Fetch pupil details
        const pupils = await sql`SELECT first_name, last_name FROM pupils WHERE id = ${pupilId}`;
        if (pupils.length === 0) throw new Error("Pupil not found");
        const pupil = pupils[0];

        // Check if attendance already exists for today
        const existing =
          await sql`SELECT id FROM attendance WHERE pupil_id = ${pupilId} AND date = ${date}`;
        let updatedAtt: any;

        if (existing.length > 0) {
          // Update existing
          const rows = await sql`
            UPDATE attendance SET 
              departure = ${time},
              departure_transport = ${transportDetails.transport},
              departure_vehicle_reg = ${transportDetails.vehicleReg || null},
              departure_person_name = ${transportDetails.personName},
              departure_person_relation = ${transportDetails.personRelation},
              departure_phone = ${transportDetails.phone || null}
            WHERE id = ${existing[0].id}
            RETURNING *
          `;
          updatedAtt = rows[0];
        } else {
          // Insert new
          const rows = await sql`
            INSERT INTO attendance (
              id, pupil_id, date, departure, 
              departure_transport, departure_vehicle_reg, departure_person_name, departure_person_relation, departure_phone
            ) VALUES (
              ${attendanceId}, ${pupilId}, ${date}, ${time},
              ${transportDetails.transport}, ${transportDetails.vehicleReg || null}, ${transportDetails.personName}, ${transportDetails.personRelation}, ${transportDetails.phone || null}
            )
            RETURNING *
          `;
          updatedAtt = rows[0];
        }

        // Fetch mapped parents to send notifications
        const parents = await sql`
          SELECT p.* FROM parents p
          JOIN pupil_parents pp ON p.id = pp.parent_id
          WHERE pp.pupil_id = ${pupilId}
        `;

        const addedNotifications: any[] = [];

        for (const parent of parents) {
          const msg = `Dear ${parent.name}, your child ${pupil.first_name} ${pupil.last_name} departed from school today at ${time} via ${transportDetails.transport} picked up by ${transportDetails.personName} (${transportDetails.personRelation}).`;
          const smsId = Math.random().toString(36).slice(2, 10);
          const emailId = Math.random().toString(36).slice(2, 10);

          // Insert SMS notification record
          await sql`
            INSERT INTO notifications (id, pupil_id, parent_id, channel, type, status, message, timestamp, phone_number)
            VALUES (${smsId}, ${pupilId}, ${parent.id}, 'sms', 'departure', 'sent', ${msg}, CURRENT_TIMESTAMP, ${parent.phone})
          `;

          // Insert Email notification record
          await sql`
            INSERT INTO notifications (id, pupil_id, parent_id, channel, type, status, message, timestamp, phone_number)
            VALUES (${emailId}, ${pupilId}, ${parent.id}, 'email', 'departure', 'sent', ${msg}, CURRENT_TIMESTAMP, ${parent.phone})
          `;

          addedNotifications.push(
            {
              id: smsId,
              pupilId,
              parentId: parent.id,
              channel: "sms",
              type: "departure",
              status: "sent",
              message: msg,
              timestamp: new Date().toISOString(),
              phoneNumber: parent.phone,
            },
            {
              id: emailId,
              pupilId,
              parentId: parent.id,
              channel: "email",
              type: "departure",
              status: "sent",
              message: msg,
              timestamp: new Date().toISOString(),
              phoneNumber: parent.phone,
            },
          );
        }

        // Log action
        const targetDesc = `${pupil.first_name} ${pupil.last_name}`;
        await safeInsertAuditLog(sql, logId, actorId, actorName, "Marked departure", targetDesc);

        const addedAudit = {
          id: logId,
          actorId,
          actorName,
          action: "Marked departure",
          target: targetDesc,
          timestamp: new Date().toISOString(),
        };

        return {
          attendance: toCamel<Attendance>(updatedAtt),
          notifications: addedNotifications,
          audit: addedAudit,
        };
      });
      serverCache.invalidateTags(["attendance", "notifications", "audit"]);

      return result;
    } catch (error) {
      console.error("Error in markDeparture:", error);
      throw error;
    }
  });

// ----------------------------------------------------
// 6. Marks Functions
// ----------------------------------------------------
export const addMark = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { mark: Omit<Mark, "id" | "recordedBy" | "recordedAt">; actorId: string }) => d,
  )
  .handler(async ({ data }) => {
    const { mark, actorId } = data;
    const id = Math.random().toString(36).slice(2, 10);
    const recordedAt = new Date().toISOString();

    // Authorization check: Verify teacher can add marks for this subject
    const actor = await sql`SELECT role, class_id, subjects FROM users WHERE id = ${actorId}`;
    if (actor.length === 0) {
      throw new Error("Unauthorized: User not found");
    }

    const user = toCamel<User>(actor[0]);

    // If user is a teacher, verify they're authorized for this subject
    if (user.role === "teacher") {
      // Check if teacher is assigned to the pupil's class
      const pupilCheck = await sql`SELECT class_id FROM pupils WHERE id = ${mark.pupilId}`;
      if (pupilCheck.length === 0) {
        throw new Error("Pupil not found");
      }

      const pupilClassId = pupilCheck[0].class_id;
      if (user.classId !== pupilClassId) {
        throw new Error("Unauthorized: You can only add marks for pupils in your assigned class");
      }

      // Check if teacher is assigned to this subject
      if (!user.subjects || !user.subjects.includes(mark.subject)) {
        throw new Error(`Unauthorized: You are not assigned to teach ${mark.subject}`);
      }
    }

    // Calculate grade based on score percentage
    const percentage = (mark.score / mark.maxScore) * 100;
    let grade = "E";
    if (percentage >= 90) grade = "A";
    else if (percentage >= 80) grade = "B";
    else if (percentage >= 70) grade = "C";
    else if (percentage >= 60) grade = "D";

    const dbMark = toSnake({
      id,
      ...mark,
      grade,
      recordedBy: actorId,
      recordedAt,
    });

    try {
      await sql`
        INSERT INTO marks ${sql(dbMark)}
      `;
      serverCache.invalidateTags(["marks", "audit"]);
      return toCamel<Mark>(dbMark);
    } catch (error) {
      console.error("Error in addMark:", error);
      throw error;
    }
  });

export const updateMark = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      id: string;
      data: Partial<Omit<Mark, "id" | "recordedBy" | "recordedAt">>;
      actorId?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const { id, data: markData, actorId } = data;

    // Authorization check if actorId is provided
    if (actorId) {
      const actor = await sql`SELECT role, class_id, subjects FROM users WHERE id = ${actorId}`;
      if (actor.length === 0) {
        throw new Error("Unauthorized: User not found");
      }

      const user = toCamel<User>(actor[0]);

      // If user is a teacher, verify they're authorized for this mark's subject
      if (user.role === "teacher") {
        // Get the mark's current subject and pupil
        const existingMark = await sql`
          SELECT m.subject, m.pupil_id, p.class_id 
          FROM marks m
          JOIN pupils p ON p.id = m.pupil_id
          WHERE m.id = ${id}
        `;

        if (existingMark.length === 0) {
          throw new Error("Mark not found");
        }

        const mark = existingMark[0];
        const pupilClassId = mark.class_id;
        const markSubject = mark.subject;

        // Check class assignment
        if (user.classId !== pupilClassId) {
          throw new Error(
            "Unauthorized: You can only update marks for pupils in your assigned class",
          );
        }

        // Check subject assignment - verify against current subject or new subject if being updated
        const subjectToCheck = markData.subject || markSubject;
        if (!user.subjects || !user.subjects.includes(subjectToCheck)) {
          throw new Error(`Unauthorized: You are not assigned to teach ${subjectToCheck}`);
        }
      }
    }

    // If score or maxScore changed, recalculate grade
    let grade: string | undefined = undefined;
    if (markData.score !== undefined || markData.maxScore !== undefined) {
      // Need to load the existing mark details to calculate grade properly if one is missing
      const existing = await sql`SELECT score, max_score FROM marks WHERE id = ${id}`;
      if (existing.length > 0) {
        const score = markData.score !== undefined ? markData.score : Number(existing[0].score);
        const maxScore =
          markData.maxScore !== undefined ? markData.maxScore : Number(existing[0].max_score);
        const percentage = (score / maxScore) * 100;
        grade = "E";
        if (percentage >= 90) grade = "A";
        else if (percentage >= 80) grade = "B";
        else if (percentage >= 70) grade = "C";
        else if (percentage >= 60) grade = "D";
      }
    }

    const dbFields = toSnake({
      ...markData,
      ...(grade !== undefined ? { grade } : {}),
    });

    try {
      await sql`
        UPDATE marks SET ${sql(dbFields)} WHERE id = ${id}
      `;
      serverCache.invalidateTags(["marks", "audit"]);
      return { id, data: { ...markData, ...(grade !== undefined ? { grade } : {}) } };
    } catch (error) {
      console.error("Error in updateMark:", error);
      throw error;
    }
  });

export const deleteMark = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    try {
      await sql`
        DELETE FROM marks WHERE id = ${data.id}
      `;
      serverCache.invalidateTags(["marks", "audit"]);
      return { id: data.id };
    } catch (error) {
      console.error("Error in deleteMark:", error);
      throw error;
    }
  });

// ----------------------------------------------------
// 7. Fees Functions
// ----------------------------------------------------
export const addFee = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      fee: Omit<Fee, "id" | "createdBy" | "createdAt" | "updatedAt">;
      actorId: string;
      actorName: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const id = Math.random().toString(36).slice(2, 10);
    const now = new Date().toISOString();
    const dbFee = toSnake({
      id,
      ...data.fee,
      createdBy: data.actorId,
      createdAt: now,
      updatedAt: now,
    });
    await sql.begin(async (tx) => {
      await tx`INSERT INTO fees ${tx(dbFee)}`;
      await safeInsertAuditLog(
        tx,
        Math.random().toString(36).slice(2, 10),
        data.actorId,
        data.actorName,
        "Added fee",
        data.fee.description,
      );
    });
    serverCache.invalidateTags(["fees", "audit"]);
    return toCamel<Fee>(dbFee);
  });

export const updateFee = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      id: string;
      data: Partial<
        Omit<Fee, "id" | "pupilId" | "schoolId" | "createdBy" | "createdAt" | "updatedAt">
      >;
      actorId: string;
      actorName: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const dbFields = toSnake({ ...data.data, updatedAt: new Date().toISOString() });
    await sql.begin(async (tx) => {
      await tx`UPDATE fees SET ${tx(dbFields)} WHERE id = ${data.id}`;
      await safeInsertAuditLog(
        tx,
        Math.random().toString(36).slice(2, 10),
        data.actorId,
        data.actorName,
        "Updated fee",
        data.id,
      );
    });
    serverCache.invalidateTags(["fees", "audit"]);
    return { id: data.id, data: { ...data.data, updatedAt: dbFields.updated_at } };
  });

export const saveBulkMarks = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      marks: Array<{
        id?: string;
        pupilId: string;
        subject: string;
        term: string;
        year: string;
        score: number;
        maxScore: number;
        teacherComment?: string;
      }>;
      actorId: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const { marks: markItems, actorId } = data;
    if (!markItems || markItems.length === 0) {
      return [];
    }

    const recordedAt = new Date().toISOString();
    const results: Mark[] = [];

    for (const item of markItems) {
      const percentage = (item.score / item.maxScore) * 100;
      let grade = "E";
      if (percentage >= 90) grade = "A";
      else if (percentage >= 80) grade = "B";
      else if (percentage >= 70) grade = "C";
      else if (percentage >= 60) grade = "D";

      let existingId = item.id;
      if (!existingId) {
        const check = await sql`
          SELECT id FROM marks 
          WHERE pupil_id = ${item.pupilId} AND subject = ${item.subject} AND term = ${item.term} AND year = ${item.year}
        `;
        if (check.length > 0) {
          existingId = check[0].id;
        }
      }

      if (existingId) {
        const dbFields = toSnake({
          score: item.score,
          maxScore: item.maxScore,
          teacherComment: item.teacherComment || "",
          grade,
        });
        await sql`
          UPDATE marks SET ${sql(dbFields)} WHERE id = ${existingId}
        `;
        const updated = await sql`SELECT * FROM marks WHERE id = ${existingId}`;
        if (updated.length > 0) {
          results.push(toCamel<Mark>(updated[0]));
        }
      } else {
        const id = Math.random().toString(36).slice(2, 10);
        const dbMark = toSnake({
          id,
          pupilId: item.pupilId,
          subject: item.subject,
          term: item.term,
          year: item.year,
          score: item.score,
          maxScore: item.maxScore,
          teacherComment: item.teacherComment || "",
          grade,
          recordedBy: actorId,
          recordedAt,
        });
        await sql`
          INSERT INTO marks ${sql(dbMark)}
        `;
        results.push(toCamel<Mark>(dbMark));
      }
    }

    serverCache.invalidateTags(["marks", "audit"]);
    return results;
  });

// ----------------------------------------------------
// 7. School Management Functions
// ----------------------------------------------------
export const addSchool = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; address?: string; phone?: string; email?: string }) => d)
  .handler(async ({ data }) => {
    const trimmedName = data.name.trim();
    const existingSchool = await sql`
      SELECT id FROM schools WHERE LOWER(name) = LOWER(${trimmedName})
    `;
    if (existingSchool.length > 0) {
      throw new Error(`A school named '${trimmedName}' already exists`);
    }

    const id = "s-" + Math.random().toString(36).slice(2, 10);
    const registeredAt = new Date().toISOString().slice(0, 10);
    const dbSchool = toSnake({
      id,
      ...data,
      name: trimmedName,
      registeredAt,
    });
    try {
      await sql`INSERT INTO schools ${sql(dbSchool)}`;
      serverCache.invalidateTags(["schools", "audit"]);
      return toCamel<School>(dbSchool);
    } catch (error: any) {
      console.error("Error in addSchool:", error);
      if (error.code === "23505" || error.message?.includes("unq_schools_name")) {
        throw new Error(`A school named '${trimmedName}' already exists`);
      }
      throw error;
    }
  });

export const updateSchool = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; data: Partial<Omit<School, "id" | "registeredAt">> }) => d)
  .handler(async ({ data }) => {
    const { id, data: schoolData } = data;
    if (schoolData.name) {
      const trimmedName = schoolData.name.trim();
      const existingSchool = await sql`
        SELECT id FROM schools WHERE LOWER(name) = LOWER(${trimmedName}) AND id != ${id}
      `;
      if (existingSchool.length > 0) {
        throw new Error(`A school named '${trimmedName}' already exists`);
      }
      schoolData.name = trimmedName;
    }
    const dbFields = toSnake(schoolData);
    try {
      await sql`UPDATE schools SET ${sql(dbFields)} WHERE id = ${id}`;
      serverCache.invalidateTags(["schools", "audit"]);
      return { id, data: schoolData };
    } catch (error: any) {
      console.error("Error in updateSchool:", error);
      if (error.code === "23505" || error.message?.includes("unq_schools_name")) {
        throw new Error(`A school named '${schoolData.name}' already exists`);
      }
      throw error;
    }
  });

export const deleteSchool = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    try {
      await sql`DELETE FROM schools WHERE id = ${data.id}`;
      serverCache.invalidateTags(["schools", "audit"]);
      return { id: data.id };
    } catch (error) {
      console.error("Error in deleteSchool:", error);
      throw error;
    }
  });

// ----------------------------------------------------
// 8. Class Management Functions
// ----------------------------------------------------
export const addClass = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { id?: string; name: string; schoolId: string; teacherId?: string; subjects?: string[] }) =>
      d,
  )
  .handler(async ({ data }) => {
    const trimmedName = data.name.trim();
    const existingClass = await sql`
      SELECT id FROM classes WHERE school_id = ${data.schoolId} AND LOWER(name) = LOWER(${trimmedName})
    `;
    if (existingClass.length > 0) {
      throw new Error(`Class '${trimmedName}' already exists in this school`);
    }

    const id = data.id || "c-" + Math.random().toString(36).slice(2, 10);
    const dbClass = toSnake({
      id,
      name: trimmedName,
      schoolId: data.schoolId,
      teacherId: data.teacherId || null,
      subjects: data.subjects || [],
    });
    try {
      await sql.begin(async (sql) => {
        await sql`INSERT INTO classes ${sql(dbClass)}`;
        if (data.teacherId) {
          await sql`UPDATE users SET class_id = ${id} WHERE id = ${data.teacherId}`;
        }
      });
      serverCache.invalidateTags(["classes", "users", "audit"]);
      return toCamel<ClassRoom>(dbClass);
    } catch (error: any) {
      console.error("Error in addClass:", error);
      if (error.code === "23505" || error.message?.includes("unq_classes_school_name")) {
        throw new Error(`Class '${trimmedName}' already exists in this school`);
      }
      throw error;
    }
  });

export const updateClass = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; data: Partial<Omit<ClassRoom, "id">> }) => d)
  .handler(async ({ data }) => {
    const { id, data: classData } = data;
    const dbFields = toSnake(classData);
    try {
      await sql.begin(async (sql) => {
        if (Object.keys(dbFields).length > 0) {
          await sql`UPDATE classes SET ${sql(dbFields)} WHERE id = ${id}`;
        }
        if (classData.teacherId !== undefined) {
          // Reset previous teacher for this class
          await sql`UPDATE users SET class_id = NULL WHERE class_id = ${id}`;
          if (classData.teacherId) {
            await sql`UPDATE users SET class_id = ${id} WHERE id = ${classData.teacherId}`;
          }
        }
      });
      serverCache.invalidateTags(["classes", "users", "audit"]);
      return { id, data: classData };
    } catch (error) {
      console.error("Error in updateClass:", error);
      throw error;
    }
  });

export const deleteClass = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    try {
      await sql.begin(async (sql) => {
        await sql`UPDATE users SET class_id = NULL WHERE class_id = ${data.id}`;
        await sql`DELETE FROM classes WHERE id = ${data.id}`;
      });
      serverCache.invalidateTags(["classes", "users", "audit"]);
      return { id: data.id };
    } catch (error) {
      console.error("Error in deleteClass:", error);
      throw error;
    }
  });

// ----------------------------------------------------
// 9. User Management Functions
// ----------------------------------------------------
export const deleteUser = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; actorId: string; actorName: string }) => d)
  .handler(async ({ data }) => {
    const { id, actorId, actorName } = data;
    const logId = Math.random().toString(36).slice(2, 10);

    try {
      await sql.begin(async (sql) => {
        // Get user details before deletion for audit log
        const users = await sql`
          SELECT name, role FROM users WHERE id = ${id}
        `;

        if (users.length === 0) {
          throw new Error("User not found");
        }

        const deletedUser = users[0];

        // Prevent super admins from deleting themselves
        if (id === actorId) {
          throw new Error("You cannot delete your own account");
        }

        // Only super_admin can delete other admins
        const actor = await sql`SELECT role FROM users WHERE id = ${actorId}`;
        if (actor.length === 0 || actor[0].role !== "super_admin") {
          if (deletedUser.role === "super_admin" || deletedUser.role === "admin") {
            throw new Error("Unauthorized: Only super admins can delete admin accounts");
          }
        }

        // Delete user
        await sql`DELETE FROM users WHERE id = ${id}`;

        // Log the deletion
        await safeInsertAuditLog(
          sql,
          logId,
          actorId,
          actorName,
          "Deleted user",
          deletedUser.name + " (" + deletedUser.role + ")",
        );
      });
      serverCache.invalidateTags(["users", "audit"]);

      return { id };
    } catch (error) {
      console.error("Error in deleteUser:", error);
      throw error;
    }
  });

export const updateUser = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      id: string;
      actorId?: string;
      actorName?: string;
      data: Partial<Omit<User, "id" | "registeredAt">> & { password?: string };
    }) => d,
  )
  .handler(async ({ data }) => {
    const { id, actorId, actorName, data: updates } = data;
    try {
      await sql.begin(async (sql) => {
        const existing = await sql`SELECT * FROM users WHERE id = ${id}`;
        if (existing.length === 0) {
          throw new Error("User not found");
        }

        const dbUpdates: Record<string, any> = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
        if (updates.email !== undefined) dbUpdates.email = updates.email.trim();
        if (updates.phone !== undefined) dbUpdates.phone = updates.phone.trim();
        if (updates.role !== undefined) dbUpdates.role = updates.role;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.schoolId !== undefined) dbUpdates.school_id = updates.schoolId || null;
        if (updates.classId !== undefined) dbUpdates.class_id = updates.classId || null;
        if (updates.subjects !== undefined) dbUpdates.subjects = updates.subjects;
        if (updates.photo !== undefined) dbUpdates.photo = updates.photo;
        if (updates.password !== undefined && updates.password.trim() !== "") {
          const rawPwd = updates.password.trim();
          if (rawPwd.startsWith("$2b$") || rawPwd.startsWith("$2a$") || rawPwd.startsWith("$2y$")) {
            dbUpdates.password = rawPwd;
          } else {
            dbUpdates.password = await bcrypt.hash(rawPwd, 10);
          }
        }

        if (Object.keys(dbUpdates).length > 0) {
          await sql`UPDATE users SET ${sql(dbUpdates)} WHERE id = ${id}`;
        }

        if (actorId && actorName) {
          const logId = Math.random().toString(36).slice(2, 10);
          await safeInsertAuditLog(
            sql,
            logId,
            actorId,
            actorName,
            "Updated user profile",
            updates.name || existing[0].name,
          );
        }
      });

      serverCache.invalidateTags(["users", "audit"]);
      return { id };
    } catch (error) {
      console.error("Error in updateUser:", error);
      throw error;
    }
  });

// ----------------------------------------------------
// 10. Subject Management Functions
// ----------------------------------------------------
export const addSubject = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { schoolId: string; name: string; code?: string; actorId?: string; actorName?: string }) =>
      d,
  )
  .handler(async ({ data }) => {
    const id = `subj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const dbSubject = toSnake({
      id,
      schoolId: data.schoolId,
      name: data.name.trim(),
      code: data.code?.trim().toUpperCase() || undefined,
    });
    try {
      await sql`INSERT INTO subjects ${sql(dbSubject)}`;
      if (data.actorId && data.actorName) {
        const logId = Math.random().toString(36).slice(2, 10);
        await safeInsertAuditLog(
          sql,
          logId,
          data.actorId,
          data.actorName,
          "Added subject",
          data.name,
        );
      }
      serverCache.invalidateTags(["subjects", "audit"]);
      return toCamel<Subject>(dbSubject);
    } catch (error) {
      console.error("Error in addSubject:", error);
      throw error;
    }
  });

export const updateSubject = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { id: string; name: string; code?: string; actorId?: string; actorName?: string }) => d,
  )
  .handler(async ({ data }) => {
    try {
      const dbFields = toSnake({
        name: data.name.trim(),
        code: data.code?.trim().toUpperCase() || undefined,
      });
      await sql`UPDATE subjects SET ${sql(dbFields)} WHERE id = ${data.id}`;
      if (data.actorId && data.actorName) {
        const logId = Math.random().toString(36).slice(2, 10);
        await safeInsertAuditLog(
          sql,
          logId,
          data.actorId,
          data.actorName,
          "Updated subject",
          data.name,
        );
      }
      serverCache.invalidateTags(["subjects", "audit"]);
      return { id: data.id, name: data.name, code: data.code };
    } catch (error) {
      console.error("Error in updateSubject:", error);
      throw error;
    }
  });

export const deleteSubject = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; actorId?: string; actorName?: string }) => d)
  .handler(async ({ data }) => {
    try {
      const subjects = await sql`SELECT name FROM subjects WHERE id = ${data.id}`;
      const subjectName = subjects[0]?.name || data.id;
      await sql`DELETE FROM subjects WHERE id = ${data.id}`;
      if (data.actorId && data.actorName) {
        const logId = Math.random().toString(36).slice(2, 10);
        await safeInsertAuditLog(
          sql,
          logId,
          data.actorId,
          data.actorName,
          "Deleted subject",
          subjectName,
        );
      }
      serverCache.invalidateTags(["subjects", "audit"]);
      return { id: data.id };
    } catch (error) {
      console.error("Error in deleteSubject:", error);
      throw error;
    }
  });

export const addSubjectsBulk = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      schoolId: string;
      subjects: Array<{ name: string; code?: string }>;
      actorId?: string;
      actorName?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    try {
      const inserted: Subject[] = [];
      for (const item of data.subjects) {
        if (!item.name.trim()) continue;
        const id = `subj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const name = item.name.trim();
        const code = item.code?.trim().toUpperCase() || undefined;
        await sql`
          INSERT INTO subjects (id, school_id, name, code)
          VALUES (${id}, ${data.schoolId}, ${name}, ${code || null})
          ON CONFLICT (school_id, name) DO NOTHING
        `;
        inserted.push({
          id,
          schoolId: data.schoolId,
          name,
          code,
        });
      }
      if (data.actorId && data.actorName) {
        const logId = Math.random().toString(36).slice(2, 10);
        await safeInsertAuditLog(
          sql,
          logId,
          data.actorId,
          data.actorName,
          "Bulk added subjects",
          `${inserted.length} subjects`,
        );
      }
      serverCache.invalidateTags(["subjects", "audit"]);
      return { count: inserted.length, subjects: inserted };
    } catch (error) {
      console.error("Error in addSubjectsBulk:", error);
      throw error;
    }
  });

export const seedDefaultSubjects = createServerFn({ method: "POST" })
  .inputValidator((d: { schoolId: string; actorId?: string; actorName?: string }) => d)
  .handler(async ({ data }) => {
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
    try {
      for (const sub of defaultList) {
        const id = `subj_${data.schoolId}_${sub.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
        await sql`
          INSERT INTO subjects (id, school_id, name, code)
          VALUES (${id}, ${data.schoolId}, ${sub.name}, ${sub.code})
          ON CONFLICT (school_id, name) DO NOTHING
        `;
      }
      if (data.actorId && data.actorName) {
        const logId = Math.random().toString(36).slice(2, 10);
        await safeInsertAuditLog(
          sql,
          logId,
          data.actorId,
          data.actorName,
          "Seeded default subjects",
          `School ${data.schoolId}`,
        );
      }
      serverCache.invalidateTags(["subjects", "audit"]);
      return { success: true };
    } catch (error) {
      console.error("Error in seedDefaultSubjects:", error);
      throw error;
    }
  });
