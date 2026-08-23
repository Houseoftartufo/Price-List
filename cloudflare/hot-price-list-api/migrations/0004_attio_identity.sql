CREATE TABLE IF NOT EXISTS attio_identity_map (
  identity_type TEXT NOT NULL CHECK (identity_type IN ('company_vat','company_name_country')),
  identity_value TEXT NOT NULL,
  attio_record_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (identity_type, identity_value)
);

CREATE INDEX IF NOT EXISTS idx_attio_identity_record
ON attio_identity_map(attio_record_id);
