-- SQL Migration / Seed file to add 5 subjects with varied marks for all students in all classes

-- 1. Ensure teachers have access to all 5 subjects
UPDATE users 
SET subjects = ARRAY['Reading', 'Math', 'Writing', 'Science', 'Art', 'Music', 'Physical Education'] 
WHERE role IN ('teacher', 'admin');

-- 2. Insert Marks for all students across 5 subjects (Reading, Math, Writing, Science, Art) for Term 1 and Term 2
-- This is generated programmatically in scratch-seed-marks.mjs for all 66 students across 9 classes.
