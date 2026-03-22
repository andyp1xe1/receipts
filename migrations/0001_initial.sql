CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY NOT NULL,
  source_url TEXT NOT NULL,
  ecc_id TEXT NOT NULL,
  url_total TEXT NOT NULL,
  url_receipt_number TEXT NOT NULL,
  url_date TEXT NOT NULL,
  merchant_name TEXT NOT NULL,
  merchant_tax_id TEXT,
  issued_at TEXT,
  total TEXT NOT NULL,
  category TEXT,
  note TEXT,
  raw_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (ecc_id, url_total, url_receipt_number, url_date)
);

CREATE INDEX IF NOT EXISTS receipts_created_at_idx ON receipts(created_at DESC);
CREATE INDEX IF NOT EXISTS receipts_url_date_idx ON receipts(url_date DESC);
CREATE INDEX IF NOT EXISTS receipts_category_idx ON receipts(category);
