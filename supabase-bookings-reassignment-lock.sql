-- Booking reassignment lock (safe / idempotent)
-- Run in Supabase SQL Editor.

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bookings'
      AND policyname = 'Prevent reassignment'
  ) THEN
    CREATE POLICY "Prevent reassignment"
      ON public.bookings
      FOR UPDATE
      USING (
        technician_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('admin', 'support')
        )
      );
  END IF;
END;
$$;
