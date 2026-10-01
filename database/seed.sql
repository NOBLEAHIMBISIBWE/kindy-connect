-- School Connect Database Seed Data (Supabase/PostgreSQL Compatible)

-- 0. Insert Schools
INSERT INTO schools (id, name, address, phone, email, registered_at) VALUES
('s1', 'Little Stars School', '123 Sunshine Blvd, Nairobi', '+254711111111', 'littlestars@kinder.app', '2025-01-01'),
('s2', 'Sunshine Academy', '456 Bright Road, Mombasa', '+254722222222', 'sunshine@kinder.app', '2025-01-05'),
('s3', 'NOBLE Primary School', '789 Education Lane, Nairobi', '+254733333333', 'noble@kinder.app', '2025-01-10')
ON CONFLICT (id) DO NOTHING;

-- 1. Insert Classes (leaving teacher_id NULL temporarily to avoid circular reference)
INSERT INTO classes (id, name, teacher_id, school_id) VALUES
('c1', 'Baby Class', NULL, 's1'),
('c2', 'Middle Class', NULL, 's1'),
('c3', 'Top Class', NULL, 's1'),
('c4', 'Pre-Unit', NULL, 's1'),
('c5', 'Sunflower', NULL, 's1'),
('c6', 'Vanguard Class', NULL, 's2'),
('c7', 'Grade 1', NULL, 's3'),
('c8', 'Grade 2', NULL, 's3')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Users (including Super Admins)
INSERT INTO users (id, name, email, role, status, phone, registered_at, password, class_id, school_id, subjects) VALUES
('KC001', 'System Administrator', 'superadmin@kinder.app', 'super_admin', 'verified', '+254700000000', '2025-01-01', 'admin123', NULL, NULL, NULL),
('KC002', 'System Administrator 2', 'superadmin2@kinder.app', 'super_admin', 'verified', '+254700000001', '2025-01-01', 'admin123', NULL, NULL, NULL),
('KC003', 'System Administrator 3', 'superadmin3@kinder.app', 'super_admin', 'verified', '+254700000002', '2025-01-01', 'admin123', NULL, NULL, NULL),
('u1', 'Amina Okello', 'admin@kinder.app', 'admin', 'verified', '+254700000003', '2025-01-10', 'admin123', NULL, 's1', NULL),
('u2', 'Brian Mwangi', 'deputy@kinder.app', 'admin', 'verified', '+254700000004', '2025-01-12', 'admin123', NULL, 's2', NULL),
('u3', 'Grace Wanjiku', 'grace@kinder.app', 'admin', 'verified', '+254700000005', '2025-02-01', 'admin123', NULL, 's3', NULL),
('u4', 'Peter Otieno (Math & Science)', 'peter@kinder.app', 'teacher', 'verified', '+254700000006', '2025-02-03', 'peter123', 'c2', 's1', ARRAY['Math', 'Science']),
('u5', 'Lucy Achieng (Reading & Writing)', 'lucy@kinder.app', 'teacher', 'pending', '+254700000007', '2025-06-15', 'lucy123', NULL, 's1', ARRAY['Reading', 'Writing']),
('u6', 'James Kariuki (All Subjects)', 'james@kinder.app', 'teacher', 'verified', '+254700000008', '2025-06-16', 'james123', 'c1', 's1', ARRAY['Reading', 'Math', 'Writing', 'Art', 'Music', 'Physical Education', 'Science']),
('u7', 'Sarah Muthoni (Art & Music)', 'sarah@kinder.app', 'teacher', 'verified', '+254700000009', '2025-03-05', 'sarah123', 'c3', 's1', ARRAY['Art', 'Music']),
('u8', 'Sunshine Admin', 'sunshineadmin@kinder.app', 'admin', 'verified', '+254733333333', '2025-01-06', 'admin123', NULL, 's2', NULL),
('noble', 'NOBLE Admin', 'nobleadmin@kinder.app', 'admin', 'verified', '+254744444444', '2025-01-10', 'admin123', NULL, 's3', NULL)
ON CONFLICT (id) DO NOTHING;

-- 3. Update Classes to map teacher_ids
UPDATE classes SET teacher_id = 'u6' WHERE id = 'c1';
UPDATE classes SET teacher_id = 'u4' WHERE id = 'c2';
UPDATE classes SET teacher_id = 'u7' WHERE id = 'c3';
UPDATE classes SET teacher_id = 'u7' WHERE id = 'c3';
UPDATE classes SET teacher_id = 'u3' WHERE id = 'c5';

-- 4. Insert Parents
INSERT INTO parents (id, name, phone, email, relationship, school_id) VALUES
('p1', 'Mary Atieno', '+254712000001', 'mary@example.com', 'Mother', 's1'),
('p2', 'John Kamau', '+254712000002', 'john@example.com', 'Father', 's1'),
('p3', 'Sarah Njeri', '+254712000003', 'sarah@example.com', 'Mother', 's1'),
('p4', 'David Mutua', '+254712000004', 'david@example.com', 'Father', 's1'),
('p5', 'Esther Wambui', '+254712000005', 'esther@example.com', 'Guardian', 's1'),
('p6', 'Paul Ochieng', '+254712000006', 'paul@example.com', 'Father', 's1'),
('p7', 'Jane Wangari', '+254712000007', 'jane@example.com', 'Mother', 's1'),
('p8', 'Michael Kipchoge', '+254712000008', 'michael@example.com', 'Father', 's1'),
('p9', 'Christine Auma', '+254712000009', 'christine@example.com', 'Mother', 's1'),
('p10', 'Robert Njenga', '+254712000010', 'robert@example.com', 'Guardian', 's1'),
('p11', 'Sunshine Parent', '+254712000011', 'sunshineparent@example.com', 'Mother', 's2')
ON CONFLICT (id) DO NOTHING;

-- 5. Insert Students
INSERT INTO students (id, admission_no, first_name, last_name, gender, dob, class_id, photo, active, school_id) VALUES
-- Baby Class (s1)
('k1', 'KG-001', 'Liam', 'Atieno', 'M', '2020-05-12', 'c1', NULL, TRUE, 's1'),
('k2', 'KG-002', 'Emma', 'Ochieng', 'F', '2020-06-18', 'c1', NULL, TRUE, 's1'),
('k3', 'KG-003', 'Noah', 'Kipchoge', 'M', '2020-04-25', 'c1', NULL, TRUE, 's1'),
-- Middle Class (s1)
('k4', 'KG-004', 'Ava', 'Mutua', 'F', '2020-02-19', 'c2', NULL, TRUE, 's1'),
('k5', 'KG-005', 'Oliver', 'Njenga', 'M', '2019-12-10', 'c2', NULL, TRUE, 's1'),
-- Top Class (s1)
('k6', 'KG-006', 'Sophia', 'Njeri', 'F', '2019-09-15', 'c3', NULL, TRUE, 's1'),
('k7', 'KG-007', 'Eli', 'Wambui', 'M', '2019-09-30', 'c3', NULL, TRUE, 's1'),
-- Sunflower Class (s1)
('k8', 'KG-008', 'Zuri', 'Kamau', 'F', '2020-08-22', 'c5', NULL, TRUE, 's1'),
('k9', 'KG-009', 'Maya', 'Auma', 'F', '2020-07-14', 'c5', NULL, TRUE, 's1'),
('k10', 'KG-010', 'Ethan', 'Wangari', 'M', '2020-05-03', 'c5', NULL, TRUE, 's1'),
-- Vanguard Class (s2)
('k11', 'KG-011', 'Sunny', 'Boy', 'M', '2020-01-01', 'c6', NULL, TRUE, 's2')
ON CONFLICT (id) DO NOTHING;

-- 6. Insert Student-Parents Join Relationships (Many-to-Many mapping)
INSERT INTO student_parents (student_id, parent_id) VALUES
('k1', 'p1'),
('k2', 'p6'),
('k3', 'p8'),
('k4', 'p4'),
('k5', 'p10'),
('k6', 'p3'),
('k7', 'p5'),
('k8', 'p2'),
('k9', 'p9'),
('k10', 'p7'),
('k11', 'p11')
ON CONFLICT (student_id, parent_id) DO NOTHING;

-- 7. Insert Attendance Records for today
INSERT INTO attendance (
    id, student_id, date, arrival, departure,
    arrival_transport, arrival_vehicle_reg, arrival_person_name, arrival_person_relation, arrival_phone,
    departure_transport, departure_vehicle_reg, departure_person_name, departure_person_relation, departure_phone
) VALUES
-- Arrivals only
('a1', 'k8', CURRENT_DATE, '07:55', NULL, 'Car', 'KAA 123B', 'John Kamau', 'Father', '+254712000002', NULL, NULL, NULL, NULL, NULL),
('a2', 'k9', CURRENT_DATE, '08:02', NULL, 'School Bus', 'KBZ 456C', 'Michael Achieng', 'Driver', '+254700000010', NULL, NULL, NULL, NULL, NULL),
-- Complete (arrival + departure)
('a3', 'k10', CURRENT_DATE, '07:48', '16:30', 'Motorcycle', 'KMCA 789D', 'Jane Wangari', 'Mother', '+254712000007', 'Car', 'KAB 321E', 'Jane Wangari', 'Mother', '+254712000007'),
-- Previous day attendance
('a4', 'k1', CURRENT_DATE - INTERVAL '1 day', '07:50', '16:00', 'Car', 'KDD 111A', 'Mary Atieno', 'Mother', '+254712000001', 'Car', 'KDD 111A', 'Mary Atieno', 'Mother', '+254712000001'),
('a5', 'k8', CURRENT_DATE - INTERVAL '1 day', '08:00', '16:15', 'Walking', 'N/A', 'John Kamau', 'Father', '+254712000002', 'Walking', 'N/A', 'John Kamau', 'Father', '+254712000002')
ON CONFLICT (id) DO NOTHING;

-- 8. Insert Notification Records
INSERT INTO notifications (id, student_id, parent_id, channel, type, status, message, timestamp, phone_number) VALUES
-- Today's notifications
('n1', 'k8', 'p2', 'sms', 'arrival', 'sent', 'Dear John Kamau, your child Zuri Kamau has arrived safely at school today at 07:55.', CURRENT_TIMESTAMP - INTERVAL '2 hours', '+254712000002'),
('n2', 'k8', 'p2', 'email', 'arrival', 'sent', 'Dear John Kamau, your child Zuri Kamau has arrived safely at school today at 07:55.', CURRENT_TIMESTAMP - INTERVAL '2 hours', NULL),
('n3', 'k9', 'p9', 'sms', 'arrival', 'sent', 'Dear Christine Auma, your child Maya Auma has arrived safely at school today at 08:02.', CURRENT_TIMESTAMP - INTERVAL '1 hour', '+254712000009'),
('n4', 'k10', 'p7', 'sms', 'departure', 'sent', 'Dear Jane Wangari, your child Ethan Wangari has left school today at 16:30.', CURRENT_TIMESTAMP - INTERVAL '30 minutes', '+254712000007'),
('n5', 'k10', 'p7', 'email', 'departure', 'failed', 'Email delivery failed', CURRENT_TIMESTAMP - INTERVAL '30 minutes', NULL),
-- Yesterday's notifications
('n6', 'k1', 'p1', 'sms', 'arrival', 'sent', 'Dear Mary Atieno, your child Liam Atieno has arrived safely at school today at 07:50.', CURRENT_TIMESTAMP - INTERVAL '1 day', '+254712000001')
ON CONFLICT (id) DO NOTHING;

-- 9. Insert Audit Logs
INSERT INTO audit_logs (id, actor_id, actor_name, action, target, timestamp) VALUES
('l1', 'u1', 'Amina Okello', 'Created student', 'Liam Atieno (KG-001)', CURRENT_TIMESTAMP - INTERVAL '5 days'),
('l2', 'u1', 'Amina Okello', 'Created student', 'Zuri Kamau (KG-008)', CURRENT_TIMESTAMP - INTERVAL '5 days'),
('l3', 'u2', 'Brian Mwangi', 'Approved teacher', 'Grace Wanjiku', CURRENT_TIMESTAMP - INTERVAL '3 days'),
('l4', 'u3', 'Grace Wanjiku', 'Marked arrival', 'Zuri Kamau', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
('l5', 'u3', 'Grace Wanjiku', 'Marked departure', 'Ethan Wangari', CURRENT_TIMESTAMP - INTERVAL '30 minutes'),
('l6', 'u1', 'Amina Okello', 'Registered user', 'James Kariuki (james@kinder.app)', CURRENT_TIMESTAMP - INTERVAL '2 days'),
('l7', 'u2', 'Brian Mwangi', 'Rejected teacher', 'Pending User', CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- 10. Insert Marks
INSERT INTO marks (id, student_id, subject, term, year, score, max_score, grade, teacher_comment, recorded_by, recorded_at) VALUES
-- Term 1 Marks
('m1', 'k8', 'Reading', 'Term 1', '2025', 85, 100, 'A', 'Excellent progress! Zuri shows great enthusiasm for reading.', 'u3', '2025-03-15 10:30:00+03'),
('m2', 'k8', 'Math', 'Term 1', '2025', 78, 100, 'B', 'Good work on numbers and counting.', 'u3', '2025-03-15 10:35:00+03'),
('m3', 'k8', 'Writing', 'Term 1', '2025', 90, 100, 'A', 'Beautiful handwriting!', 'u3', '2025-03-15 10:40:00+03'),
('m4', 'k9', 'Reading', 'Term 1', '2025', 92, 100, 'A', 'Outstanding! Maya is a natural reader.', 'u3', '2025-03-15 11:00:00+03'),
('m5', 'k9', 'Math', 'Term 1', '2025', 88, 100, 'A', 'Excellent problem-solving skills.', 'u3', '2025-03-15 11:05:00+03'),
('m6', 'k10', 'Reading', 'Term 1', '2025', 75, 100, 'B', 'Good progress. Keep practicing!', 'u3', '2025-03-15 11:10:00+03'),
-- Term 2 Marks
('m7', 'k8', 'Reading', 'Term 2', '2025', 88, 100, 'A', 'Consistent improvement!', 'u3', '2025-06-20 10:30:00+03'),
('m8', 'k8', 'Math', 'Term 2', '2025', 82, 100, 'A', 'Much better understanding of concepts.', 'u3', '2025-06-20 10:35:00+03')
ON CONFLICT (id) DO NOTHING;
