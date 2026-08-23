CREATE TABLE IF NOT EXISTS quote_sequences (
  year INTEGER PRIMARY KEY,
  next_value INTEGER NOT NULL CHECK (next_value > 0)
);
