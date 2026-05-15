-- Booking events audit trail (safe / idempotent)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.booking_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  actor_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('admin', 'support', 'technician', 'client')),
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_events_booking_id ON public.booking_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_events_created_at ON public.booking_events(created_at DESC);

ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'booking_events'
      AND policyname = 'booking_events_insert_own'
  ) THEN
    CREATE POLICY "booking_events_insert_own"
      ON public.booking_events
      FOR INSERT
      WITH CHECK (auth.uid() = actor_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'booking_events'
      AND policyname = 'booking_events_select_related'
  ) THEN
    CREATE POLICY "booking_events_select_related"
      ON public.booking_events
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.bookings b
          WHERE b.id = booking_id
            AND (
              b.user_id = auth.uid()
              OR b.technician_id = auth.uid()
              OR EXISTS (
                SELECT 1
                FROM public.profiles p
                WHERE p.id = auth.uid()
                  AND p.role IN ('admin', 'support')
              )
            )
        )
      );
  END IF;
END;
$$;
