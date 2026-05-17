-- Store aliases: every time a user renames a store via Manage Stores,
-- the previous name is kept as an alias on the renamed row. Receipt OCR
-- then matches the raw store text Claude extracts (e.g., "COSTCO
-- WHOLESALE #1234") against both the canonical name and any aliases,
-- automatically substituting the canonical name into the receipt review
-- form. Users never have to re-correct the same OCR output twice.

alter table stores
  add column aliases text[] not null default '{}';
