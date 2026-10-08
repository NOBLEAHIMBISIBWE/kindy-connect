-- Migration: Add UNIQUE constraints to prevent duplicate entries across tables

DO $$ 
BEGIN
    -- 1. Schools unique name constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unq_schools_name'
    ) THEN
        ALTER TABLE schools ADD CONSTRAINT unq_schools_name UNIQUE (name);
    END IF;

    -- 2. Classes unique school_id + name constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unq_classes_school_name'
    ) THEN
        ALTER TABLE classes ADD CONSTRAINT unq_classes_school_name UNIQUE (school_id, name);
    END IF;

    -- 3. Parents unique school_id + phone constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unq_parents_school_phone'
    ) THEN
        ALTER TABLE parents ADD CONSTRAINT unq_parents_school_phone UNIQUE (school_id, phone);
    END IF;

    -- 4. Attendance unique student_id + date constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unq_attendance_student_date'
    ) THEN
        ALTER TABLE attendance ADD CONSTRAINT unq_attendance_student_date UNIQUE (student_id, date);
    END IF;

    -- 5. Marks unique student_id + subject + term + year constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unq_marks_student_subject_term_year'
    ) THEN
        ALTER TABLE marks ADD CONSTRAINT unq_marks_student_subject_term_year UNIQUE (student_id, subject, term, year);
    END IF;
END $$;
