-- Technician job discovery + claim RLS policies (safe / idempotent)
-- Run this in Supabase SQL Editor.

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bookings'
      AND policyname = 'Technicians can view available bookings'
  ) THEN
    CREATE POLICY "Technicians can view available bookings"
      ON public.bookings
      FOR SELECT
      USING (
        technician_id IS NULL
        AND status = 'pending'
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'technician'
        )
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bookings'
      AND policyname = 'Technicians can claim available bookings'
  ) THEN
    CREATE POLICY "Technicians can claim available bookings"
      ON public.bookings
      FOR UPDATE
      USING (
        technician_id IS NULL
        AND status = 'pending'
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'technician'
        )
      )
      WITH CHECK (
        technician_id = auth.uid()
        AND status = 'assigned'
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'technician'
        )
      );
  END IF;
END;
$$;
