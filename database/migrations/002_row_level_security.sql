-- Migration: Row Level Security Policies
-- Description: Enable RLS and create policies for multi-tenant data isolation

-- ====================
-- 1. USERS TABLE
-- ====================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Super Admin sees all users
CREATE POLICY super_admin_all_users ON users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.user_id', true)
            AND u.role = 'super_admin'
        )
    );

-- Policy: School-scoped users see only their school's users
CREATE POLICY school_scoped_users ON users
    FOR ALL
    USING (
        school_id = current_setting('app.school_id', true)::VARCHAR
    );

-- ====================
-- 2. CLASSES TABLE
-- ====================
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Policy: Super Admin sees all classes
CREATE POLICY super_admin_all_classes ON classes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = current_setting('app.user_id', true)
            AND users.role = 'super_admin'
        )
    );

-- Policy: School-scoped users see only their school's classes
CREATE POLICY school_scoped_classes ON classes
    FOR ALL
    USING (
        school_id = current_setting('app.school_id', true)::VARCHAR
    );


-- ====================
-- 3. STUDENTS TABLE
-- ====================
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policy: Super Admin sees all students
CREATE POLICY super_admin_all_students ON students
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = current_setting('app.user_id', true)
            AND users.role = 'super_admin'
        )
    );

-- Policy: School-scoped users see only their school's students
CREATE POLICY school_scoped_students ON students
    FOR ALL
    USING (
        school_id = current_setting('app.school_id', true)::VARCHAR
    );

-- ====================
-- 4. PARENTS TABLE
-- ====================
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;

-- Policy: Super Admin sees all parents
CREATE POLICY super_admin_all_parents ON parents
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = current_setting('app.user_id', true)
            AND users.role = 'super_admin'
        )
    );

-- Policy: School-scoped users see only their school's parents
CREATE POLICY school_scoped_parents ON parents
    FOR ALL
    USING (
        school_id = current_setting('app.school_id', true)::VARCHAR
    );


-- ====================
-- 5. ATTENDANCE TABLE
-- ====================
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Policy: Super Admin sees all attendance records
CREATE POLICY super_admin_all_attendance ON attendance
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = current_setting('app.user_id', true)
            AND users.role = 'super_admin'
        )
    );

-- Policy: School-scoped users see only attendance for students in their school
CREATE POLICY school_scoped_attendance ON attendance
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM students
            WHERE students.id = attendance.student_id
            AND students.school_id = current_setting('app.school_id', true)::VARCHAR
        )
    );

-- ====================
-- 6. NOTIFICATIONS TABLE
-- ====================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Super Admin sees all notifications
CREATE POLICY super_admin_all_notifications ON notifications
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = current_setting('app.user_id', true)
            AND users.role = 'super_admin'
        )
    );

-- Policy: School-scoped users see only notifications for students in their school
CREATE POLICY school_scoped_notifications ON notifications
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM students
            WHERE students.id = notifications.student_id
            AND students.school_id = current_setting('app.school_id', true)::VARCHAR
        )
    );


-- ====================
-- 7. MARKS TABLE
-- ====================
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;

-- Policy: Super Admin sees all marks
CREATE POLICY super_admin_all_marks ON marks
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = current_setting('app.user_id', true)
            AND users.role = 'super_admin'
        )
    );

-- Policy: School-scoped users see only marks for students in their school
CREATE POLICY school_scoped_marks ON marks
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM students
            WHERE students.id = marks.student_id
            AND students.school_id = current_setting('app.school_id', true)::VARCHAR
        )
    );

-- ====================
-- 8. SCHOOLS TABLE
-- ====================
-- Note: Schools table does NOT need RLS as it should be visible to all authenticated users
-- Super Admin needs to manage all schools
-- School-scoped users need to read their own school details

-- ====================
-- 9. AUDIT_LOGS TABLE
-- ====================
-- Note: Audit logs are filtered in application code by joining to users.school_id
-- RLS not strictly needed here, but can be added for defense in depth
-- Audit logs should be visible to users in the same school as the actor

