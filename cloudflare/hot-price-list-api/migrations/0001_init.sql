PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS catalogue_products (
  sku TEXT PRIMARY KEY,
  public_json TEXT NOT NULL,
  internal_json TEXT NOT NULL,
  health TEXT NOT NULL CHECK (health IN ('READY','WARNING','BLOCKED')),
  verified_at TEXT NOT NULL,
  billit_modified_at TEXT,
  shopify_modified_at TEXT
);

CREATE TABLE IF NOT EXISTS catalogue_syncs (
  sync_id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('billit','shopify','reconciliation')),
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  item_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  error_summary TEXT
);

CREATE TABLE IF NOT EXISTS quotes (
  quote_id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  locale TEXT NOT NULL,
  preferred_channel TEXT NOT NULL,
  customer_json TEXT NOT NULL,
  total_ex_vat REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  catalogue_verified_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  billit_status TEXT NOT NULL DEFAULT 'pending',
  billit_order_id TEXT,
  attio_status TEXT NOT NULL DEFAULT 'pending',
  attio_deal_id TEXT,
  admin_status TEXT NOT NULL DEFAULT 'pending',
  last_error TEXT
);

CREATE TABLE IF NOT EXISTS quote_lines (
  quote_id TEXT NOT NULL,
  line_no INTEGER NOT NULL,
  sku TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  PRIMARY KEY (quote_id, line_no),
  FOREIGN KEY (quote_id) REFERENCES quotes(quote_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS provider_attempts (
  attempt_id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('billit','attio','admin')),
  attempt INTEGER NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  response_ref TEXT,
  error_code TEXT,
  error_message TEXT,
  FOREIGN KEY (quote_id) REFERENCES quotes(quote_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quote_events (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (quote_id) REFERENCES quotes(quote_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS price_history (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL,
  old_amount_excl REAL,
  new_amount_excl REAL NOT NULL,
  vat_rate REAL NOT NULL,
  observed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_billit_status ON quotes(billit_status);
CREATE INDEX IF NOT EXISTS idx_quotes_attio_status ON quotes(attio_status);
CREATE INDEX IF NOT EXISTS idx_provider_attempts_quote ON provider_attempts(quote_id, provider);
CREATE INDEX IF NOT EXISTS idx_quote_events_quote ON quote_events(quote_id, created_at);
CREATE INDEX IF NOT EXISTS idx_price_history_sku ON price_history(sku, observed_at DESC);
