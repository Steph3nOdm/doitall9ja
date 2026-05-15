-- Production hardening for bookings (idempotent)
-- Enforces transition rules, payment gates, assignment lock, admin override, and automatic audit logging.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0) Ensure booking_events exists for centralized audit writes.
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

-- 1) Admin override flag (required for reassignment override path)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS override_assignment BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) Normalize legacy statuses into strict production statuses.
UPDATE public.bookings
SET status = CASE lower(trim(COALESCE(status, '')))
  WHEN 'new' THEN 'pending'
  WHEN 'contacted' THEN 'pending'
  WHEN 'inspection_scheduled' THEN 'assigned'
  WHEN 'scheduled' THEN 'assigned'
  WHEN 'pending' THEN 'pending'
  WHEN 'assigned' THEN 'assigned'
  WHEN 'quoted' THEN 'quoted'
  WHEN 'approved' THEN 'approved'
  WHEN 'paid' THEN 'paid'
  WHEN 'in_progress' THEN 'in_progress'
  WHEN 'completed' THEN 'completed'
  WHEN 'cancelled' THEN 'cancelled'
  ELSE 'pending'
END;

-- 3) Replace status check with strict allowed statuses.
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.bookings'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ~* '\\(status\\s+IN\\s*\\('
  LOOP
    EXECUTE format('ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;

  ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_status_strict_check
    CHECK (status IN ('pending', 'assigned', 'in_progress', 'quoted', 'approved', 'paid', 'completed', 'cancelled'));
END;
$$;

-- Keep payment status strict as well.
DO $$
BEGIN
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

-- 4) Status helpers for strict transition enforcement.
CREATE OR REPLACE FUNCTION public.normalize_booking_status(p_status TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE lower(trim(COALESCE(p_status, '')))
    WHEN 'new' THEN 'pending'
    WHEN 'contacted' THEN 'pending'
    WHEN 'inspection_scheduled' THEN 'assigned'
    WHEN 'scheduled' THEN 'assigned'
    WHEN 'pending' THEN 'pending'
    WHEN 'assigned' THEN 'assigned'
    WHEN 'quoted' THEN 'quoted'
    WHEN 'approved' THEN 'approved'
    WHEN 'paid' THEN 'paid'
    WHEN 'in_progress' THEN 'in_progress'
    WHEN 'completed' THEN 'completed'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.booking_can_transition(p_current TEXT, p_next TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_current TEXT := public.normalize_booking_status(p_current);
  v_next TEXT := public.normalize_booking_status(p_next);
BEGIN
  IF v_current IS NULL OR v_next IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_current = v_next THEN
    RETURN TRUE;
  END IF;

  CASE v_current
    WHEN 'pending' THEN RETURN v_next IN ('assigned', 'cancelled');
    WHEN 'assigned' THEN RETURN v_next IN ('quoted', 'cancelled');
    WHEN 'quoted' THEN RETURN v_next IN ('approved', 'cancelled');
    WHEN 'approved' THEN RETURN v_next IN ('paid', 'cancelled');
    WHEN 'paid' THEN RETURN v_next IN ('in_progress', 'cancelled');
    WHEN 'in_progress' THEN RETURN v_next IN ('completed', 'cancelled');
    WHEN 'completed' THEN RETURN FALSE;
    WHEN 'cancelled' THEN RETURN FALSE;
    ELSE RETURN FALSE;
  END CASE;
END;
$$;

-- 5) Guardrail trigger: status transitions, payment gate, assignment lock, override validation.
CREATE OR REPLACE FUNCTION public.enforce_booking_guardrails()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_actor_role TEXT;
  v_old_norm TEXT;
  v_new_norm TEXT;
  v_tech_changed BOOLEAN;
  v_override_requested BOOLEAN := COALESCE(NEW.override_assignment, FALSE);
BEGIN
  IF v_actor_id IS NOT NULL THEN
    SELECT p.role INTO v_actor_role
    FROM public.profiles p
    WHERE p.id = v_actor_id;
  END IF;

  IF v_actor_role IS NULL THEN
    v_actor_role := 'support';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := COALESCE(NEW.status, 'pending');
    NEW.status := public.normalize_booking_status(NEW.status);

    IF NEW.status IS NULL THEN
      RAISE EXCEPTION 'Invalid status value'
        USING ERRCODE = '22023';
    END IF;

    NEW.payment_status := COALESCE(NEW.payment_status, 'pending');

    IF NEW.status IN ('in_progress', 'completed')
       AND NEW.payment_status <> 'paid' THEN
      RAISE EXCEPTION 'Payment required before work';
    END IF;

    IF NEW.status = 'assigned' AND NEW.technician_id IS NULL THEN
      RAISE EXCEPTION 'Assigned status requires technician_id';
    END IF;

    IF v_override_requested THEN
      RAISE EXCEPTION 'override_assignment is only valid on updates';
    END IF;

    RETURN NEW;
  END IF;

  -- UPDATE path
  NEW.status := COALESCE(NEW.status, OLD.status, 'pending');
  NEW.status := public.normalize_booking_status(NEW.status);

  IF NEW.status IS NULL THEN
    RAISE EXCEPTION 'Invalid status value'
      USING ERRCODE = '22023';
  END IF;

  NEW.payment_status := COALESCE(NEW.payment_status, OLD.payment_status, 'pending');

  v_old_norm := COALESCE(public.normalize_booking_status(OLD.status), 'pending');
  v_new_norm := NEW.status;

  IF v_new_norm IS DISTINCT FROM v_old_norm
     AND NOT public.booking_can_transition(v_old_norm, v_new_norm) THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %', v_old_norm, v_new_norm;
  END IF;

  -- Payment-before-work enforcement
  IF v_new_norm IN ('in_progress', 'completed')
     AND COALESCE(NEW.payment_status, 'pending') <> 'paid' THEN
    RAISE EXCEPTION 'Payment required before work';
  END IF;

  -- Assignment lock enforcement
  v_tech_changed := NEW.technician_id IS DISTINCT FROM OLD.technician_id;

  IF v_override_requested AND NOT v_tech_changed THEN
    RAISE EXCEPTION 'override_assignment can only be used when technician_id changes';
  END IF;

  IF v_override_requested AND v_actor_role NOT IN ('admin', 'support') THEN
    RAISE EXCEPTION 'Only admin/support can use override_assignment';
  END IF;

  IF v_tech_changed THEN
    -- First assignment (NULL -> technician) is always allowed if status becomes/contains assigned flow.
    IF OLD.technician_id IS NULL AND NEW.technician_id IS NOT NULL THEN
      IF v_new_norm <> 'assigned' THEN
        RAISE EXCEPTION 'Assigning technician requires status = assigned';
      END IF;

    -- Reassignment requires explicit admin override.
    ELSIF OLD.technician_id IS NOT NULL AND NEW.technician_id IS NOT NULL THEN
      IF NOT v_override_requested THEN
        RAISE EXCEPTION 'Job already assigned. Set override_assignment=true to override';
      END IF;

    -- Unassign also requires explicit admin override.
    ELSIF OLD.technician_id IS NOT NULL AND NEW.technician_id IS NULL THEN
      IF NOT v_override_requested THEN
        RAISE EXCEPTION 'Cannot unassign technician without override_assignment=true';
      END IF;
    END IF;
  END IF;

  IF NEW.status = 'assigned' AND NEW.technician_id IS NULL THEN
    RAISE EXCEPTION 'Assigned status requires technician_id';
  END IF;

  -- One-shot override flag: consume it so it cannot leak into future updates.
  IF v_override_requested THEN
    NEW.override_assignment := FALSE;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_bookings_guardrails ON public.bookings;
CREATE TRIGGER tr_bookings_guardrails
BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.enforce_booking_guardrails();

-- 6) Centralized audit trigger (all inserts + updates)
CREATE OR REPLACE FUNCTION public.log_booking_events_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_actor_role TEXT;
  v_action TEXT := 'updated';
  v_metadata JSONB := '{}'::jsonb;
  v_override_used BOOLEAN := FALSE;
BEGIN
  IF v_actor_id IS NOT NULL THEN
    SELECT p.role INTO v_actor_role
    FROM public.profiles p
    WHERE p.id = v_actor_id;
  END IF;

  IF COALESCE(v_actor_role, '') NOT IN ('admin', 'support', 'technician', 'client') THEN
    v_actor_role := 'support';
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_metadata := jsonb_build_object(
      'status', NEW.status,
      'payment_status', NEW.payment_status,
      'quote_status', NEW.quote_status,
      'technician_id', NEW.technician_id
    );
  ELSE
    v_override_used := (
      OLD.technician_id IS NOT NULL
      AND NEW.technician_id IS NOT NULL
      AND NEW.technician_id IS DISTINCT FROM OLD.technician_id
    );

    v_metadata := jsonb_build_object(
      'status_from', OLD.status,
      'status_to', NEW.status,
      'payment_status_from', OLD.payment_status,
      'payment_status_to', NEW.payment_status,
      'quote_status_from', OLD.quote_status,
      'quote_status_to', NEW.quote_status,
      'technician_id_from', OLD.technician_id,
      'technician_id_to', NEW.technician_id,
      'override_used', v_override_used
    );

    IF NEW.technician_id IS DISTINCT FROM OLD.technician_id THEN
      IF OLD.technician_id IS NULL AND NEW.technician_id IS NOT NULL THEN
        v_action := 'assigned';
      ELSIF OLD.technician_id IS NOT NULL AND NEW.technician_id IS NOT NULL THEN
        v_action := 'reassigned';
      ELSE
        v_action := 'unassigned';
      END IF;
    ELSIF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      v_action := 'payment_updated';
    ELSIF NEW.quote_status IS DISTINCT FROM OLD.quote_status THEN
      v_action := 'quote_updated';
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
      v_action := 'status_updated';
    ELSE
      v_action := 'updated';
    END IF;
  END IF;

  INSERT INTO public.booking_events (
    booking_id,
    actor_id,
    actor_role,
    action,
    metadata
  ) VALUES (
    NEW.id,
    v_actor_id,
    v_actor_role,
    v_action,
    v_metadata
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_bookings_audit_events ON public.bookings;
CREATE TRIGGER tr_bookings_audit_events
AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.log_booking_events_trigger();

-- 7) Fail-safe secure wrapper (invalid booking_id rejected explicitly)
--    Use this RPC for critical updates where you want DB-thrown errors on missing booking IDs.
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
  v_technician_text TEXT;
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

  IF p_patch ? 'technician_id' THEN
    v_technician_text := NULLIF(trim(COALESCE(p_patch->>'technician_id', '')), '');
    IF v_technician_text IS NOT NULL THEN
      PERFORM v_technician_text::uuid;
    END IF;
  END IF;

  UPDATE public.bookings b
  SET
    status = COALESCE(v_status, b.status),
    payment_status = COALESCE(v_payment_status, b.payment_status),
    quote_status = COALESCE(v_quote_status, b.quote_status),
    technician_id = CASE
      WHEN p_patch ? 'technician_id' THEN NULLIF(trim(COALESCE(p_patch->>'technician_id', '')), '')::uuid
      ELSE b.technician_id
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
