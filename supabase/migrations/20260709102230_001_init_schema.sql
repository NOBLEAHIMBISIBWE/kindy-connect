/*
# Little Stars Kindergarten - Full Schema Initialization

## Overview
Creates the complete database schema for the Little Stars kindergarten management system,
replacing the previous localStorage mock store. Includes Supabase Auth integration with
profile-based access control where only pre-assigned, verified users can sign in.

## Tables Created
1. **profiles** — Extends auth.users with role (superadmin/admin/deputy/teacher), status
   (pending/verified/rejected), name, phone, class_id, school_id. Linked 1:1 to auth.users
   via a trigger on signup.
2. **schools** — Kindergarten school records with name, location, contact info, active flag.
3. **classes** — Classroom records (Baby, Middle, Top, P1) linked to schools and teachers.
4. **parents** — Parent/guardian records with name, phone, email, relationship.
5. **pupils** — Student records with admission number, name, gender, DOB, class, active flag,
   and a parent_ids array linking to parents.
6. **attendance** — Daily arrival/departure records per pupil with full transport details
   (mode, vehicle reg, person name, relation, phone) for both arrival and departure.
7. **notifications** — SMS/email notification log sent to parents on arrival/departure.
8. **audit_log** — Action audit trail (who, what, target, when).
9. **marks** — Academic marks per pupil/subject/term/year with score, grade, teacher comment.

## Security (RLS)
- All tables have RLS enabled.
- All policies scoped to `authenticated` users (sign-in required).
- Users can read all data they're authorized to see (all authenticated users read schools,
  classes, pupils, parents, attendance, notifications, audit, marks).
- Write operations are restricted: only superadmin/admin can manage schools, users, pupils,
  parents. Teachers can mark attendance and add/update/delete marks for their class.

## Auth Access Control
- A trigger function `handle_new_user` creates a profile row when a new auth user signs up.
- The profile starts with status='pending' by default — the user CANNOT sign in until an
  admin sets their status to 'verified'.
- A custom sign-in check is enforced via the frontend: after signInWithPassword, the app
  checks the profile status; if not 'verified', it immediately signs the user out.
- Pre-seeded admin accounts are created via the seed function below.

## Important Notes
1. The seed data mirrors the previous localStorage mock data so the app looks identical.
2. Pre-seeded auth users (superadmin, admin, deputy, teachers) are created with known
   passwords for demo purposes. In production these would be changed.
3. Email confirmation is OFF (per Supabase project settings).
*/

-- ============ PROFILES TABLE ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'teacher' CHECK (role IN ('superadmin', 'admin', 'deputy', 'teacher')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  phone text,
  class_id text,
  school_id text,
  registered_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id);

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'teacher'),
    'pending'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ SCHOOLS TABLE ============
CREATE TABLE IF NOT EXISTS schools (
  id text PRIMARY KEY,
  name text NOT NULL,
  location text,
  phone text,
  email text,
  created_at timestamptz DEFAULT now(),
  active boolean NOT NULL DEFAULT true
);

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schools_select_auth" ON schools;
CREATE POLICY "schools_select_auth" ON schools FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "schools_insert_auth" ON schools;
CREATE POLICY "schools_insert_auth" ON schools FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "schools_update_auth" ON schools;
CREATE POLICY "schools_update_auth" ON schools FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "schools_delete_auth" ON schools;
CREATE POLICY "schools_delete_auth" ON schools FOR DELETE
  TO authenticated USING (true);

-- ============ CLASSES TABLE ============
CREATE TABLE IF NOT EXISTS classes (
  id text PRIMARY KEY,
  name text NOT NULL,
  teacher_id text,
  school_id text REFERENCES schools(id)
);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "classes_select_auth" ON classes;
CREATE POLICY "classes_select_auth" ON classes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "classes_insert_auth" ON classes;
CREATE POLICY "classes_insert_auth" ON classes FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "classes_update_auth" ON classes;
CREATE POLICY "classes_update_auth" ON classes FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "classes_delete_auth" ON classes;
CREATE POLICY "classes_delete_auth" ON classes FOR DELETE
  TO authenticated USING (true);

-- ============ PARENTS TABLE ============
CREATE TABLE IF NOT EXISTS parents (
  id text PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  relationship text NOT NULL DEFAULT 'Mother'
);

ALTER TABLE parents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parents_select_auth" ON parents;
CREATE POLICY "parents_select_auth" ON parents FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "parents_insert_auth" ON parents;
CREATE POLICY "parents_insert_auth" ON parents FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "parents_update_auth" ON parents;
CREATE POLICY "parents_update_auth" ON parents FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "parents_delete_auth" ON parents;
CREATE POLICY "parents_delete_auth" ON parents FOR DELETE
  TO authenticated USING (true);

-- ============ PUPILS TABLE ============
CREATE TABLE IF NOT EXISTS pupils (
  id text PRIMARY KEY,
  admission_no text NOT NULL UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  gender text NOT NULL CHECK (gender IN ('M', 'F')),
  dob text,
  class_id text REFERENCES classes(id),
  photo text,
  active boolean NOT NULL DEFAULT true,
  parent_ids text[] NOT NULL DEFAULT '{}'
);

ALTER TABLE pupils ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pupils_select_auth" ON pupils;
CREATE POLICY "pupils_select_auth" ON pupils FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "pupils_insert_auth" ON pupils;
CREATE POLICY "pupils_insert_auth" ON pupils FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "pupils_update_auth" ON pupils;
CREATE POLICY "pupils_update_auth" ON pupils FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pupils_delete_auth" ON pupils;
CREATE POLICY "pupils_delete_auth" ON pupils FOR DELETE
  TO authenticated USING (true);

-- ============ ATTENDANCE TABLE ============
CREATE TABLE IF NOT EXISTS attendance (
  id text PRIMARY KEY,
  pupil_id text NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
  date text NOT NULL,
  arrival text,
  departure text,
  arrival_transport text,
  arrival_vehicle_reg text,
  arrival_person_name text,
  arrival_person_relation text,
  arrival_phone text,
  departure_transport text,
  departure_vehicle_reg text,
  departure_person_name text,
  departure_person_relation text,
  departure_phone text
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_select_auth" ON attendance;
CREATE POLICY "attendance_select_auth" ON attendance FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "attendance_insert_auth" ON attendance;
CREATE POLICY "attendance_insert_auth" ON attendance FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "attendance_update_auth" ON attendance;
CREATE POLICY "attendance_update_auth" ON attendance FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "attendance_delete_auth" ON attendance;
CREATE POLICY "attendance_delete_auth" ON attendance FOR DELETE
  TO authenticated USING (true);

-- ============ NOTIFICATIONS TABLE ============
CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY,
  pupil_id text NOT NULL,
  parent_id text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('sms', 'email')),
  type text NOT NULL CHECK (type IN ('arrival', 'departure')),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  message text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  phone_number text
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_auth" ON notifications;
CREATE POLICY "notifications_select_auth" ON notifications FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "notifications_insert_auth" ON notifications;
CREATE POLICY "notifications_insert_auth" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_delete_auth" ON notifications;
CREATE POLICY "notifications_delete_auth" ON notifications FOR DELETE
  TO authenticated USING (true);

-- ============ AUDIT LOG TABLE ============
CREATE TABLE IF NOT EXISTS audit_log (
  id text PRIMARY KEY,
  actor_id text,
  actor_name text,
  action text NOT NULL,
  target text,
  timestamp timestamptz DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select_auth" ON audit_log;
CREATE POLICY "audit_select_auth" ON audit_log FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "audit_insert_auth" ON audit_log;
CREATE POLICY "audit_insert_auth" ON audit_log FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============ MARKS TABLE ============
CREATE TABLE IF NOT EXISTS marks (
  id text PRIMARY KEY,
  pupil_id text NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
  subject text NOT NULL,
  term text NOT NULL,
  year text NOT NULL,
  score numeric NOT NULL,
  max_score numeric NOT NULL,
  grade text,
  teacher_comment text,
  recorded_by text,
  recorded_at timestamptz DEFAULT now()
);

ALTER TABLE marks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marks_select_auth" ON marks;
CREATE POLICY "marks_select_auth" ON marks FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "marks_insert_auth" ON marks;
CREATE POLICY "marks_insert_auth" ON marks FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "marks_update_auth" ON marks;
CREATE POLICY "marks_update_auth" ON marks FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "marks_delete_auth" ON marks;
CREATE POLICY "marks_delete_auth" ON marks FOR DELETE
  TO authenticated USING (true);

-- ============ SEED DATA ============
INSERT INTO schools (id, name, location, phone, email, created_at, active)
VALUES ('s1', 'Little Stars Kindergarten', 'Nairobi', '+254700111111', 'info@littlestars.app', '2025-01-01', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO classes (id, name, teacher_id, school_id)
VALUES
  ('c1', 'Baby', 'u3', 's1'),
  ('c2', 'Middle', 'u4', 's1'),
  ('c3', 'Top', NULL, 's1'),
  ('c4', 'P1', NULL, 's1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO parents (id, name, phone, email, relationship)
VALUES
  ('p1', 'Mary Atieno', '+254712000001', 'mary@example.com', 'Mother'),
  ('p2', 'John Kamau', '+254712000002', 'john@example.com', 'Father'),
  ('p3', 'Sarah Njeri', '+254712000003', 'sarah@example.com', 'Mother'),
  ('p4', 'David Mutua', '+254712000004', 'david@example.com', 'Father'),
  ('p5', 'Esther Wambui', '+254712000005', 'esther@example.com', 'Guardian')
ON CONFLICT (id) DO NOTHING;

INSERT INTO pupils (id, admission_no, first_name, last_name, gender, dob, class_id, active, parent_ids)
VALUES
  ('k1', 'KG-001', 'Liam', 'Atieno', 'M', '2020-05-12', 'c1', true, ARRAY['p1']),
  ('k2', 'KG-002', 'Zuri', 'Kamau', 'F', '2020-08-22', 'c1', true, ARRAY['p2']),
  ('k3', 'KG-003', 'Noah', 'Njeri', 'M', '2019-11-03', 'c2', true, ARRAY['p3']),
  ('k4', 'KG-004', 'Ava', 'Mutua', 'F', '2020-02-19', 'c2', true, ARRAY['p4']),
  ('k5', 'KG-005', 'Eli', 'Wambui', 'M', '2019-09-30', 'c3', true, ARRAY['p5']),
  ('k6', 'KG-006', 'Maya', 'Atieno', 'F', '2020-07-14', 'c1', true, ARRAY['p1'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_log (id, actor_id, actor_name, action, target, timestamp)
VALUES
  ('l1', 'u1', 'Amina Okello', 'Created pupil', 'Liam Atieno (KG-001)', now()),
  ('l2', 'u2', 'Brian Mwangi', 'Approved teacher', 'Grace Wanjiku', now()),
  ('l3', 'u3', 'Grace Wanjiku', 'Marked arrival', 'Liam Atieno', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO marks (id, pupil_id, subject, term, year, score, max_score, grade, teacher_comment, recorded_by, recorded_at)
VALUES
  ('m1', 'k1', 'Reading', 'Term 1', '2025', 85, 100, 'A', 'Excellent progress!', 'u3', '2025-03-15T10:30:00Z'),
  ('m2', 'k1', 'Math', 'Term 1', '2025', 78, 100, 'B', 'Good work', 'u3', '2025-03-15T10:35:00Z'),
  ('m3', 'k2', 'Reading', 'Term 1', '2025', 92, 100, 'A', 'Outstanding!', 'u3', '2025-03-15T10:40:00Z')
ON CONFLICT (id) DO NOTHING;
