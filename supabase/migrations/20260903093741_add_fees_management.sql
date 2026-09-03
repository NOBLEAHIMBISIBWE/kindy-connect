-- Fees management: reusable fee structures, pupil charges, and payments.
CREATE TABLE IF NOT EXISTS fee_structures (
    id VARCHAR(50) PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    term VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unq_fee_structures_school_name_term_year UNIQUE (school_id, name, term, year)
);

CREATE TABLE IF NOT EXISTS fee_charges (
    id VARCHAR(50) PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    fee_structure_id VARCHAR(50) NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
    pupil_id VARCHAR(50) NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unq_fee_charge_pupil_structure UNIQUE (fee_structure_id, pupil_id)
);

CREATE TABLE IF NOT EXISTS fee_payments (
    id VARCHAR(50) PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    charge_id VARCHAR(50) NOT NULL REFERENCES fee_charges(id) ON DELETE CASCADE,
    pupil_id VARCHAR(50) NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    paid_on DATE NOT NULL DEFAULT CURRENT_DATE,
    reference VARCHAR(100),
    notes TEXT,
    recorded_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fee_structures_school_term_year
    ON fee_structures (school_id, term, year);
CREATE INDEX IF NOT EXISTS idx_fee_charges_school_pupil
    ON fee_charges (school_id, pupil_id);
CREATE INDEX IF NOT EXISTS idx_fee_charges_structure
    ON fee_charges (fee_structure_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_school_pupil
    ON fee_payments (school_id, pupil_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_charge
    ON fee_payments (charge_id);

-- Keep every fee table tenant-scoped when accessed through the Data API.
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY fee_structures_school_access ON fee_structures
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.user_id', true)
              AND u.role IN ('super_admin', 'admin', 'deputy')
              AND (u.role = 'super_admin' OR u.school_id = fee_structures.school_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.user_id', true)
              AND u.role IN ('super_admin', 'admin', 'deputy')
              AND (u.role = 'super_admin' OR u.school_id = fee_structures.school_id)
        )
    );

CREATE POLICY fee_charges_school_access ON fee_charges
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.user_id', true)
              AND u.role IN ('super_admin', 'admin', 'deputy')
              AND (u.role = 'super_admin' OR u.school_id = fee_charges.school_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.user_id', true)
              AND u.role IN ('super_admin', 'admin', 'deputy')
              AND (u.role = 'super_admin' OR u.school_id = fee_charges.school_id)
        )
    );

CREATE POLICY fee_payments_school_access ON fee_payments
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.user_id', true)
              AND u.role IN ('super_admin', 'admin', 'deputy')
              AND (u.role = 'super_admin' OR u.school_id = fee_payments.school_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.user_id', true)
              AND u.role IN ('super_admin', 'admin', 'deputy')
              AND (u.role = 'super_admin' OR u.school_id = fee_payments.school_id)
        )
    );