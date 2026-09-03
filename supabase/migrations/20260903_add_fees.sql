CREATE TABLE IF NOT EXISTS fees (
    id VARCHAR(50) PRIMARY KEY,
    pupil_id VARCHAR(50) NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
    school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    term VARCHAR(50) NOT NULL,
    year VARCHAR(4) NOT NULL,
    amount_due NUMERIC(12, 2) NOT NULL CHECK (amount_due > 0),
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    due_date DATE,
    notes TEXT,
    created_by VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_fee_paid_limit CHECK (amount_paid <= amount_due),
    CONSTRAINT unq_fee_pupil_description_term_year UNIQUE (pupil_id, description, term, year)
);

CREATE INDEX IF NOT EXISTS idx_fees_school_id ON fees(school_id);
CREATE INDEX IF NOT EXISTS idx_fees_pupil_id ON fees(pupil_id);

ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fees_school_access ON fees;
CREATE POLICY fees_school_access ON fees
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id::text = current_setting('app.user_id', true)
      AND role = 'super_admin'
    )
    OR school_id IN (SELECT school_id FROM users WHERE id::text = current_setting('app.user_id', true))
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id::text = current_setting('app.user_id', true)
      AND role = 'super_admin'
    )
    OR school_id IN (SELECT school_id FROM users WHERE id::text = current_setting('app.user_id', true))
  );