CREATE TABLE IF NOT EXISTS provider_jobs (
  quote_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('billit','attio','admin')),
  status TEXT NOT NULL DEFAULT 'pending',
  attempt INTEGER NOT NULL DEFAULT 0,
  available_at TEXT NOT NULL,
  locked_at TEXT,
  completed_at TEXT,
  last_error TEXT,
  PRIMARY KEY (quote_id, provider),
  FOREIGN KEY (quote_id) REFERENCES quotes(quote_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_provider_jobs_pending
ON provider_jobs(status, available_at);
