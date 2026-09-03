-- School Connect Database Schema (Supabase/PostgreSQL Compatible)

-- Drop tables if they exist (for clean migrations)
DROP TABLE IF EXISTS marks CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS pupil_parents CASCADE;
DROP TABLE IF EXISTS pupils CASCADE;
DROP TABLE IF EXISTS parents CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS schools CASCADE;

-- 0. Schools Table
CREATE TABLE schools (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    address VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    registered_at DATE NOT NULL DEFAULT CURRENT_DATE
);

-- 1. Classes Table
CREATE TABLE classes (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    teacher_id VARCHAR(50),
    school_id VARCHAR(50) NOT NULL,
    CONSTRAINT unq_classes_school_name UNIQUE (school_id, name)
);

-- 2. Users Table
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin', 'deputy', 'teacher')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    phone VARCHAR(50) UNIQUE,
    class_id VARCHAR(50),
    registered_at DATE NOT NULL DEFAULT CURRENT_DATE,
    password VARCHAR(255) NOT NULL,
    school_id VARCHAR(50),
    subjects TEXT[],
    photo TEXT
);

-- 3. Parents Table
CREATE TABLE parents (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    school_id VARCHAR(50) NOT NULL,
    CONSTRAINT unq_parents_school_phone UNIQUE (school_id, phone)
);

-- 4. Pupils Table
CREATE TABLE pupils (
    id VARCHAR(50) PRIMARY KEY,
    admission_no VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender CHAR(1) NOT NULL CHECK (gender IN ('M', 'F')),
    dob DATE NOT NULL,
    class_id VARCHAR(50) NOT NULL,
    photo TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    school_id VARCHAR(50) NOT NULL
);

-- 5. Pupil-Parents Join Table (Many-to-Many relationship)
CREATE TABLE pupil_parents (
    pupil_id VARCHAR(50) NOT NULL,
    parent_id VARCHAR(50) NOT NULL,
    PRIMARY KEY (pupil_id, parent_id)
);

-- 6. Attendance Table
CREATE TABLE attendance (
    id VARCHAR(50) PRIMARY KEY,
    pupil_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    arrival TIME,
    departure TIME,
    arrival_transport VARCHAR(100),
    arrival_vehicle_reg VARCHAR(50),
    arrival_person_name VARCHAR(255),
    arrival_person_relation VARCHAR(100),
    arrival_phone VARCHAR(50),
    departure_transport VARCHAR(100),
    departure_vehicle_reg VARCHAR(50),
    departure_person_name VARCHAR(255),
    departure_person_relation VARCHAR(100),
    departure_phone VARCHAR(50),
    CONSTRAINT unq_attendance_pupil_date UNIQUE (pupil_id, date)
);

-- 7. Notifications Table
CREATE TABLE notifications (
    id VARCHAR(50) PRIMARY KEY,
    pupil_id VARCHAR(50) NOT NULL,
    parent_id VARCHAR(50) NOT NULL,
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('sms', 'email')),
    type VARCHAR(50) NOT NULL CHECK (type IN ('arrival', 'departure')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('sent', 'failed')),
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    phone_number VARCHAR(50)
);

-- 8. Audit Logs Table
CREATE TABLE audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    actor_id VARCHAR(50) NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    target VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Marks Table
CREATE TABLE marks (
    id VARCHAR(50) PRIMARY KEY,
    pupil_id VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    term VARCHAR(50) NOT NULL,
    year VARCHAR(4) NOT NULL,
    score NUMERIC NOT NULL CHECK (score >= 0),
    max_score NUMERIC NOT NULL CHECK (max_score > 0),
    grade VARCHAR(10),
    teacher_comment TEXT,
    recorded_by VARCHAR(50) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_score_limit CHECK (score <= max_score),
    CONSTRAINT unq_marks_pupil_subject_term_year UNIQUE (pupil_id, subject, term, year)
);

-- 10. Subjects Table
CREATE TABLE subjects (
    id VARCHAR(50) PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unq_school_subject_name UNIQUE (school_id, name)
);

-- 11. Fees Table
CREATE TABLE fees (
    id VARCHAR(50) PRIMARY KEY,
    pupil_id VARCHAR(50) NOT NULL,
    school_id VARCHAR(50) NOT NULL,
    description VARCHAR(255) NOT NULL,
    term VARCHAR(50) NOT NULL,
    year VARCHAR(4) NOT NULL,
    amount_due NUMERIC(12, 2) NOT NULL CHECK (amount_due > 0),
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    due_date DATE,
    notes TEXT,
    created_by VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_fee_paid_limit CHECK (amount_paid <= amount_due),
    CONSTRAINT unq_fee_pupil_description_term_year UNIQUE (pupil_id, description, term, year)
);

-- Add Foreign Key Constraints (separately to resolve circular dependency at table creation)
ALTER TABLE classes 
    ADD CONSTRAINT fk_classes_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_classes_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

ALTER TABLE subjects
    ADD CONSTRAINT fk_subjects_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

ALTER TABLE fees
    ADD CONSTRAINT fk_fees_pupil FOREIGN KEY (pupil_id) REFERENCES pupils(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_fees_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_fees_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE users 
    ADD CONSTRAINT fk_users_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_users_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL;

ALTER TABLE pupils 
    ADD CONSTRAINT fk_pupils_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_pupils_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

ALTER TABLE parents 
    ADD CONSTRAINT fk_parents_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

ALTER TABLE pupil_parents 
    ADD CONSTRAINT fk_pupil_parents_pupil FOREIGN KEY (pupil_id) REFERENCES pupils(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_pupil_parents_parent FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE;

ALTER TABLE attendance 
    ADD CONSTRAINT fk_attendance_pupil FOREIGN KEY (pupil_id) REFERENCES pupils(id) ON DELETE CASCADE;

ALTER TABLE notifications 
    ADD CONSTRAINT fk_notifications_pupil FOREIGN KEY (pupil_id) REFERENCES pupils(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_notifications_parent FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE;

ALTER TABLE audit_logs 
    ADD CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE marks 
    ADD CONSTRAINT fk_marks_pupil FOREIGN KEY (pupil_id) REFERENCES pupils(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_marks_recorded FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE RESTRICT;

-- Create Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_school ON users(school_id);
CREATE INDEX idx_classes_school ON classes(school_id);
CREATE INDEX idx_subjects_school ON subjects(school_id);
CREATE INDEX idx_pupils_class ON pupils(class_id);
CREATE INDEX idx_pupils_school ON pupils(school_id);
CREATE INDEX idx_parents_school ON parents(school_id);
CREATE INDEX idx_attendance_pupil_date ON attendance(pupil_id, date);
CREATE INDEX idx_marks_pupil ON marks(pupil_id);
CREATE INDEX idx_notifications_pupil ON notifications(pupil_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

