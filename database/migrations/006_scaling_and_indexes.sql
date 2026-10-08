-- Migration 006: Database Scaling & Index Optimization for High-Performance Querying

-- Composite index for rapid student report card and mark filtering (by student, subject, term, year)
CREATE INDEX IF NOT EXISTS idx_marks_student_subject_term_year ON marks(student_id, subject, term, year);

-- Reverse foreign key index on student_parents join table for parent-to-student lookups
CREATE INDEX IF NOT EXISTS idx_student_parents_parent ON student_parents(parent_id);

-- Composite index on attendance ordered by date DESC and arrival for daily status queries
CREATE INDEX IF NOT EXISTS idx_attendance_date_arrival ON attendance(date DESC, arrival DESC);

-- Composite index for multi-tenant school users and role filtering
CREATE INDEX IF NOT EXISTS idx_users_school_role ON users(school_id, role);

-- Composite index for multi-tenant student roster queries by school and class
CREATE INDEX IF NOT EXISTS idx_students_school_class ON students(school_id, class_id);

-- Composite index on notifications by student and timestamp
CREATE INDEX IF NOT EXISTS idx_notifications_student_timestamp ON notifications(student_id, timestamp DESC);

-- Composite index on audit logs by actor and timestamp
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_timestamp ON audit_logs(actor_id, timestamp DESC);
