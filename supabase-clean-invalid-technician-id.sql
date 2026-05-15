-- Clean invalid technician references (safe)
-- Use this if old data stored names or bad IDs in technician_id.

UPDATE public.bookings b
SET technician_id = NULL,
    status = CASE WHEN b.status = 'assigned' THEN 'pending' ELSE b.status END
WHERE b.technician_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = b.technician_id
  );

UPDATE public.jobs j
SET technician_id = NULL,
    assigned_by = NULL,
    status = CASE WHEN j.status = 'assigned' THEN 'pending' ELSE j.status END
WHERE j.technician_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = j.technician_id
  );
