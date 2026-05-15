-- Booking + assignment stabilization hotfix (idempotent)
-- Run this in Supabase SQL editor before/with deployment.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS quote_status TEXT DEFAULT 'pending';

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.bookings'::regclass
      AND conname = 'bookings_quote_status_check'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_quote_status_check
      CHECK (quote_status IN ('pending', 'quoted', 'approved', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.bookings'::regclass
      AND conname = 'bookings_payment_status_check'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_payment_status_check
      CHECK (payment_status IN ('pending', 'paid', 'failed'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'technicians'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'technicians_legacy'
  ) THEN
    ALTER TABLE public.technicians RENAME TO technicians_legacy;
  END IF;
END;
$$;

-- Optional verification queries
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings';
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('technicians','technicians_legacy');
