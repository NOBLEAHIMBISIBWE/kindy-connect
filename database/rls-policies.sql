-- Row Level Security (RLS) Policies for School Connect

-- Enable RLS on all tables
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean setup)
DROP POLICY IF EXISTS "classes_select_policy" ON classes;
DROP POLICY IF EXISTS "classes_insert_policy" ON classes;
DROP POLICY IF EXISTS "classes_update_policy" ON classes;
DROP POLICY IF EXISTS "classes_delete_policy" ON classes;

DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;

DROP POLICY IF EXISTS "parents_select_policy" ON parents;
DROP POLICY IF EXISTS "parents_insert_policy" ON parents;
DROP POLICY IF EXISTS "parents_update_policy" ON parents;
DROP POLICY IF EXISTS "parents_delete_policy" ON parents;

DROP POLICY IF EXISTS "students_select_policy" ON students;
DROP POLICY IF EXISTS "students_insert_policy" ON students;
DROP POLICY IF EXISTS "students_update_policy" ON students;
DROP POLICY IF EXISTS "students_delete_policy" ON students;

DROP POLICY IF EXISTS "student_parents_select_policy" ON student_parents;
DROP POLICY IF EXISTS "student_parents_insert_policy" ON student_parents;
DROP POLICY IF EXISTS "student_parents_update_policy" ON student_parents;
DROP POLICY IF EXISTS "student_parents_delete_policy" ON student_parents;

DROP POLICY IF EXISTS "attendance_select_policy" ON attendance;
DROP POLICY IF EXISTS "attendance_insert_policy" ON attendance;
DROP POLICY IF EXISTS "attendance_update_policy" ON attendance;
DROP POLICY IF EXISTS "attendance_delete_policy" ON attendance;

DROP POLICY IF EXISTS "notifications_select_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications;

DROP POLICY IF EXISTS "audit_logs_select_policy" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON audit_logs;

DROP POLICY IF EXISTS "marks_select_policy" ON marks;
DROP POLICY IF EXISTS "marks_insert_policy" ON marks;
DROP POLICY IF EXISTS "marks_update_policy" ON marks;
DROP POLICY IF EXISTS "marks_delete_policy" ON marks;

-- ===========================================
-- CLASSES TABLE POLICIES
-- ===========================================

-- SELECT: All authenticated users can view classes
CREATE POLICY "classes_select_policy" ON classes
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Only admins and deputies can create classes
CREATE POLICY "classes_insert_policy" ON classes
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::text 
        AND users.role IN ('admin', 'deputy')
        AND users.status = 'verified'
    )
);

-- UPDATE: Only admins and deputies can update classes
CREATE POLICY "classes_update_policy" ON classes
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::text 
        AND users.role IN ('admin', 'deputy')
        AND users.status = 'verified'
    )
);

-- DELETE: Only admins can delete classes
CREATE POLICY "classes_delete_policy" ON classes
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::text 
        AND users.role = 'admin'
        AND users.status = 'verified'
    )
);

-- ===========================================
-- USERS TABLE POLICIES
-- ===========================================

-- SELECT: Users can view their own record, admins/deputies can view all
CREATE POLICY "users_select_policy" ON users
FOR SELECT
TO authenticated
USING (
    users.id = auth.uid()::text
    OR EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = auth.uid()::text 
        AND u.role IN ('admin', 'deputy')
        AND u.status = 'verified'
    )
);

-- INSERT: Only admins can create new users
CREATE POLICY "users_insert_policy" ON users
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::text 
        AND users.role = 'admin'
        AND users.status = 'verified'
    )
);

-- UPDATE: Users can update their own record, admins can update all
CREATE POLICY "users_update_policy" ON users
FOR UPDATE
TO authenticated
USING (
    users.id = auth.uid()::text
    OR EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = auth.uid()::text 
        AND u.role = 'admin'
        AND u.status = 'verified'
    )
);

-- DELETE: Only admins can delete users
CREATE POLICY "users_delete_policy" ON users
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::text 
        AND users.role = 'admin'
        AND users.status = 'verified'
    )
);

-- ===========================================
-- PARENTS TABLE POLICIES
-- ===========================================

-- SELECT: All verified staff can view parents
CREATE POLICY "parents_select_policy" ON parents
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::text 
        AND users.status = 'verified'
    )
);

-- INSERT: Admins and deputies can create parents
CREATE POLICY "parents_insert_policy" ON parents
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::text 
        AND users.role IN ('admin', 'deputy')
        AND users.status = 'verified'
    )
);

-- UPDATE: Admins and deputies can update parents
CREATE POLICY "parents_update_policy" ON parents
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::text 
        AND users.role IN ('admin', 'deputy')
        AND users.status = 'verified'
    )
);

-- DELETE: Only admins can delete parents
CREATE POLICY "parents_delete_policy" ON parents
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::text 
        AND users.role = 'admin'
        AND users.status = 'verified'
    )
);

-- ===========================================
-- STUDENTS TABLE POLICIES
-- ===========================================

-- SELECT: Teachers can see their class students, admins/deputies see all
CREATE POLICY "students_select_policy" ON students
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::text 
        AND users.status = 'verified'
        AND (
            users.role IN ('admin', 'deputy')
            OR (users.role = 'teacher' AND users.class_id = students.class_id)
        )
    )
);

-- INSERT: Admins and deputies can create students
CREATE POLICY "students_insert_policy" ON students
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::text 
        AND users.role IN ('admin', 'deputy')
        AND users.status = 'verified'
    )
);

-- UPDATE: Admins and deputies can update students
CREATE POLICY "students_update_policy" ON students
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::text 
        AND users.role IN ('admin', 'deputy')
        AND users.status = 'verified'
    )
);

-- DELETE: Only admins can delete students
CREATE POLICY "students_delete_policy" ON students
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::text 
        AND users.role = 'admin'
        AND users.status = 'verified'
    )
);

-- ===========================================
-- STUDENT_PARENTS TABLE POLICIES
-- ===========================================

-- SELECT: All verified staff can view student-parent relationships
CREATE POLICY "student_parents_select_policy" ON student_parents
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::text 
        AND users.status = 'verified'
    )
);

-- INSERT: Admins and deputies can link students to parents
CREATE POLICY "student_parents_insert_policy" ON student_parents
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::text 
        AND users.role IN ('admin', 'deputy')
        AND users.status = 'verified'
    )
);

-- UPDATE: Admins and deputies can update relationships
CREATE POLICY "student_parents_update_policy" ON student_parents
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::text 
        AND users.role IN ('admin', 'deputy')
        AND users.status = 'verified'
    )
);

-- DELETE: Admins and deputies can remove relationships
CREATE POLICY "student_parents_delete_policy" ON student_parents
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::text 
        AND users.role IN ('admin', 'deputy')
        AND users.status = 'verified'
    )
);

-- ===========================================
-- ATTENDANCE TABLE POLICIES
-- ===========================================

-- SELECT: Teachers see their class, admins/deputies see all
CREATE POLICY "attendance_select_policy" ON attendance
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        JOIN students ON students.id = attendance.student_id
        WHERE users.id = auth.uid()::text 
        AND users.status = 'verified'
        AND (
            users.role IN ('admin', 'deputy')
            OR (users.role = 'teacher' AND users.class_id = students.class_id)
        )
    )
);

-- INSERT: Teachers can mark attendance for their class, admins/deputies for all
CREATE POLICY "attendance_insert_policy" ON attendance
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users 
        JOIN students ON students.id = attendance.student_id
        WHERE users.id = auth.uid()::text 
        AND users.status = 'verified'
        AND (
            users.role IN ('admin', 'deputy')
            OR (users.role = 'teacher' AND users.class_id = students.class_id)
        )
    )
);

-- UPDATE: Teachers can update attendance for their class, admins/deputies for all
CREATE POLICY "attendance_update_policy" ON attendance
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        JOIN students ON students.id = attendance.student_id
        WHERE users.id = auth.uid()::text 
        AND users.status = 'verified'
        AND (
            users.role IN ('admin', 'deputy')
            OR (users.role = 'teacher' AND users.class_id = students.class_id)
        )
    )
);

-- DELETE: Only admins can delete attendance records
CREATE POLICY "attendance_delete_policy" ON attendance
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::text 
        AND users.role = 'admin'
        AND users.status = 'verified'
    )
);

-- ===========================================
-- NOTIFICATIONS TABLE POLICIES
-- ===========================================

-- SELECT: All verified staff can view notifications
CREATE POLICY "notifications_select_policy" ON notifications
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::text 
        AND users.status = 'verified'
    )
);

-- INSERT: System can create notifications (usually triggered by attendance)
CREATE POLICY "notifications_insert_policy" ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::text 
        AND users.status = 'verified'
    )
);

-- ===========================================
-- AUDIT_LOGS TABLE POLICIES
-- ===========================================

-- SELECT: All verified staff can view audit logs
CREATE POLICY "audit_logs_select_policy" ON audit_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::text 
        AND users.status = 'verified'
    )
);

-- INSERT: All verified staff can create audit logs
CREATE POLICY "audit_logs_insert_policy" ON audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::text 
        AND users.status = 'verified'
    )
);

-- ===========================================
-- MARKS TABLE POLICIES
-- ===========================================

-- SELECT: Teachers see their class marks for assigned subjects only, admins/deputies see all
CREATE POLICY "marks_select_policy" ON marks
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        JOIN students ON students.id = marks.student_id
        WHERE users.id = auth.uid()::text 
        AND users.status = 'verified'
        AND (
            users.role IN ('admin', 'deputy')
            OR (
                users.role = 'teacher' 
                AND users.class_id = students.class_id
                AND marks.subject = ANY(users.subjects)
            )
        )
    )
);

-- INSERT: Teachers can add marks for their class AND assigned subjects only, admins/deputies for all
CREATE POLICY "marks_insert_policy" ON marks
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users 
        JOIN students ON students.id = marks.student_id
        WHERE users.id = auth.uid()::text 
        AND users.status = 'verified'
        AND (
            users.role IN ('admin', 'deputy')
            OR (
                users.role = 'teacher' 
                AND users.class_id = students.class_id
                AND marks.subject = ANY(users.subjects)
            )
        )
    )
);

-- UPDATE: Teachers can update marks for their class AND assigned subjects only, admins/deputies for all
CREATE POLICY "marks_update_policy" ON marks
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        JOIN students ON students.id = marks.student_id
        WHERE users.id = auth.uid()::text 
        AND users.status = 'verified'
        AND (
            users.role IN ('admin', 'deputy')
            OR (
                users.role = 'teacher' 
                AND users.class_id = students.class_id
                AND marks.subject = ANY(users.subjects)
            )
        )
    )
);

-- DELETE: Only admins can delete marks
CREATE POLICY "marks_delete_policy" ON marks
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid()::text 
        AND users.role = 'admin'
        AND users.status = 'verified'
    )
);

-- ===========================================
-- GRANT PERMISSIONS TO AUTHENTICATED USERS
-- ===========================================

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
