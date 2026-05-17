-- Admin notes on feedback: each feedback row can have a free-text note
-- from the app author tracking what was done about it (fixed, won't-fix,
-- needs-clarification, etc.). admin_note_at records when the note was
-- last edited.

alter table feedback
  add column admin_note text,
  add column admin_note_at timestamptz;
