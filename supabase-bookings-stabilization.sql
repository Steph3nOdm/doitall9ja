-- Bookings stabilization patch (safe / idempotent)
-- Purpose: reduce 400 query/insert failures caused by schema mismatches.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS service TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'service'
  ) THEN
    ALTER TABLE public.bookings
      ALTER COLUMN service DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'date'
  ) THEN
    ALTER TABLE public.bookings
      ALTER COLUMN date DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'time'
  ) THEN
    ALTER TABLE public.bookings
      ALTER COLUMN time DROP NOT NULL;
  END IF;
END;
$$;

-- Validation query (run after migration)
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bookings'
ORDER BY ordinal_position;
