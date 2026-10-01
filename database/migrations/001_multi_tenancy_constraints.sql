-- Migration: Multi-Tenancy Constraints
-- Description: Add constraints and indexes to enforce multi-tenant data isolation

-- 1. Add CHECK constraints to users table
-- Super admin must have null school_id, other roles must have non-null school_id
ALTER TABLE users
ADD CONSTRAINT chk_super_admin_no_school 
CHECK (
  (role = 'super_admin' AND school_id IS NULL) OR
  (role != 'super_admin' AND school_id IS NOT NULL)
);

-- 2. Verify indexes exist on school_id columns (these should already exist from schema.sql)
-- If not present, create them:

-- Users school_id index (should already exist as idx_users_school)
CREATE INDEX IF NOT EXISTS idx_users_school ON users(school_id);

-- Classes school_id index (should already exist as idx_classes_school)
CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id);

-- Students school_id index (should already exist as idx_students_school)
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);

-- Parents school_id index (should already exist as idx_parents_school)
CREATE INDEX IF NOT EXISTS idx_parents_school ON parents(school_id);

-- 3. Verify foreign key constraints exist (should already be set from schema.sql)
-- These are already defined in schema.sql:
-- - classes.school_id → schools.id
-- - users.school_id → schools.id
-- - students.school_id → schools.id
-- - parents.school_id → schools.id

-- 4. Add index for audit logs filtering by actor's school (via user join)
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);

-- 5. Add composite index for attendance filtering by student and date
-- (should already exist as idx_attendance_student_date)
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);

