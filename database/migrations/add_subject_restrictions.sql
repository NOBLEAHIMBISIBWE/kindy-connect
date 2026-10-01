-- Migration: Add Subject-Level Access Control for Teachers
-- Description: Updates RLS policies to restrict teachers to only access marks for their assigned subjects
-- Date: 2025-07-05

-- Drop existing marks policies
DROP POLICY IF EXISTS "marks_select_policy" ON marks;
DROP POLICY IF EXISTS "marks_insert_policy" ON marks;
DROP POLICY IF EXISTS "marks_update_policy" ON marks;

-- Recreate marks policies with subject restrictions

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

-- Verify the changes
-- You can test by querying as a teacher user:
-- SET SESSION ROLE authenticated;
-- SET SESSION "request.jwt.claims" TO '{"sub": "teacher-id-here"}';
-- SELECT * FROM marks; -- Should only show marks for assigned subjects
