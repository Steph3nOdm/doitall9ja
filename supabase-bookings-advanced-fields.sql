-- Advanced bookings fields (safe, idempotent)
-- Run in Supabase SQL editor.

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Lagos',
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS preferred_date DATE,
ADD COLUMN IF NOT EXISTS preferred_time TEXT,
ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS budget_type TEXT DEFAULT 'negotiable',
ADD COLUMN IF NOT EXISTS budget_amount INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_urgency_check'
  ) THEN
    ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_urgency_check
    CHECK (urgency IN ('low','medium','high','emergency'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_budget_type_check'
  ) THEN
    ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_budget_type_check
    CHECK (budget_type IN ('fixed','hourly','negotiable'));
  END IF;
END;
$$;

-- Validation
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bookings'
ORDER BY ordinal_position;
