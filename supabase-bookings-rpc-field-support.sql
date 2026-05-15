-- Extends update_booking_secure field support without changing signature/guardrail model.
-- Run AFTER supabase-bookings-production-hardening.sql

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS service TEXT,
  ADD COLUMN IF NOT EXISTS service_id UUID,
  ADD COLUMN IF NOT EXISTS date DATE,
  ADD COLUMN IF NOT EXISTS time TEXT,
  ADD COLUMN IF NOT EXISTS job_type TEXT DEFAULT 'inspection',
  ADD COLUMN IF NOT EXISTS quoted_price INTEGER,
  ADD COLUMN IF NOT EXISTS quote_details JSONB,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.bookings'::regclass
      AND conname = 'bookings_job_type_check'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_job_type_check
      CHECK (job_type IN ('inspection', 'fixed'));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_booking_secure(
  p_booking_id UUID,
  p_patch JSONB DEFAULT '{}'::jsonb,
  p_override BOOLEAN DEFAULT FALSE
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_updated public.bookings;
  v_status TEXT;
  v_payment_status TEXT;
  v_quote_status TEXT;
  v_job_type TEXT;
  v_technician_text TEXT;
  v_service_id_text TEXT;
  v_date_text TEXT;
  v_time_text TEXT;
  v_payment_reference TEXT;
  v_service TEXT;
  v_quoted_price_numeric NUMERIC;
BEGIN
  IF p_booking_id IS NULL THEN
    RAISE EXCEPTION 'booking_id is required' USING ERRCODE = '22023';
  END IF;

  IF p_patch IS NULL THEN
    p_patch := '{}'::jsonb;
  END IF;

  IF jsonb_typeof(p_patch) <> 'object' THEN
    RAISE EXCEPTION 'patch must be a JSON object' USING ERRCODE = '22023';
  END IF;

  IF p_patch ? 'status' THEN
    v_status := public.normalize_booking_status(p_patch->>'status');
    IF v_status IS NULL THEN
      RAISE EXCEPTION 'Invalid status value: %', p_patch->>'status' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_patch ? 'payment_status' THEN
    v_payment_status := lower(trim(COALESCE(p_patch->>'payment_status', '')));
    IF v_payment_status NOT IN ('pending', 'paid', 'failed') THEN
      RAISE EXCEPTION 'Invalid payment_status value: %', p_patch->>'payment_status' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_patch ? 'quote_status' THEN
    v_quote_status := lower(trim(COALESCE(p_patch->>'quote_status', '')));
    IF v_quote_status NOT IN ('pending', 'quoted', 'approved', 'rejected') THEN
      RAISE EXCEPTION 'Invalid quote_status value: %', p_patch->>'quote_status' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_patch ? 'job_type' THEN
    v_job_type := lower(trim(COALESCE(p_patch->>'job_type', '')));
    IF v_job_type NOT IN ('inspection', 'fixed') THEN
      RAISE EXCEPTION 'Invalid job_type value: %', p_patch->>'job_type' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_patch ? 'technician_id' THEN
    v_technician_text := NULLIF(trim(COALESCE(p_patch->>'technician_id', '')), '');
    IF v_technician_text IS NOT NULL THEN
      PERFORM v_technician_text::uuid;
    END IF;
  END IF;

  IF p_patch ? 'service_id' THEN
    v_service_id_text := NULLIF(trim(COALESCE(p_patch->>'service_id', '')), '');
    IF v_service_id_text IS NOT NULL THEN
      PERFORM v_service_id_text::uuid;
    END IF;
  END IF;

  IF p_patch ? 'date' THEN
    v_date_text := NULLIF(trim(COALESCE(p_patch->>'date', '')), '');
    IF v_date_text IS NOT NULL THEN
      PERFORM v_date_text::date;
    END IF;
  END IF;

  IF p_patch ? 'time' THEN
    v_time_text := NULLIF(trim(COALESCE(p_patch->>'time', '')), '');
  END IF;

  IF p_patch ? 'payment_reference' THEN
    v_payment_reference := NULLIF(trim(COALESCE(p_patch->>'payment_reference', '')), '');
  END IF;

  IF p_patch ? 'service' THEN
    v_service := NULLIF(trim(COALESCE(p_patch->>'service', '')), '');
  END IF;

  IF p_patch ? 'quoted_price' THEN
    BEGIN
      v_quoted_price_numeric := (p_patch->>'quoted_price')::numeric;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid quoted_price value: %', p_patch->>'quoted_price' USING ERRCODE = '22023';
    END;

    IF v_quoted_price_numeric < 0 THEN
      RAISE EXCEPTION 'Invalid quoted_price value: %', p_patch->>'quoted_price' USING ERRCODE = '22023';
    END IF;
  END IF;

  UPDATE public.bookings b
  SET
    status = COALESCE(v_status, b.status),
    payment_status = COALESCE(v_payment_status, b.payment_status),
    quote_status = COALESCE(v_quote_status, b.quote_status),
    job_type = COALESCE(v_job_type, b.job_type),
    technician_id = CASE
      WHEN p_patch ? 'technician_id' THEN NULLIF(trim(COALESCE(p_patch->>'technician_id', '')), '')::uuid
      ELSE b.technician_id
    END,
    service_id = CASE
      WHEN p_patch ? 'service_id' THEN NULLIF(trim(COALESCE(p_patch->>'service_id', '')), '')::uuid
      ELSE b.service_id
    END,
    service = CASE
      WHEN p_patch ? 'service' THEN v_service
      ELSE b.service
    END,
    date = CASE
      WHEN p_patch ? 'date' THEN NULLIF(trim(COALESCE(p_patch->>'date', '')), '')::date
      ELSE b.date
    END,
    time = CASE
      WHEN p_patch ? 'time' THEN v_time_text
      ELSE b.time
    END,
    quoted_price = CASE
      WHEN p_patch ? 'quoted_price' THEN ROUND((p_patch->>'quoted_price')::numeric)::integer
      ELSE b.quoted_price
    END,
    quote_details = CASE
      WHEN p_patch ? 'quote_details' THEN p_patch->'quote_details'
      ELSE b.quote_details
    END,
    payment_reference = CASE
      WHEN p_patch ? 'payment_reference' THEN v_payment_reference
      ELSE b.payment_reference
    END,
    override_assignment = p_override
  WHERE b.id = p_booking_id
  RETURNING * INTO v_updated;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid booking_id: %', p_booking_id USING ERRCODE = 'P0002';
  END IF;

  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_booking_secure(UUID, JSONB, BOOLEAN)
TO authenticated, service_role;
