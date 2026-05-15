-- Booking system extension migration (idempotent)
-- Adds required booking linkage fields for authenticated users.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  technician_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  job_type TEXT NOT NULL DEFAULT 'inspection' CHECK (job_type IN ('inspection', 'fixed')),
  quoted_price INTEGER,
  quote_details JSONB,
  quote_status TEXT NOT NULL DEFAULT 'pending' CHECK (quote_status IN ('pending', 'quoted', 'approved', 'rejected')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  payment_reference TEXT,
  service TEXT,
  date DATE,
  time TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  service_id UUID REFERENCES services(id) ON DELETE RESTRICT NOT NULL,
  service_name TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Lagos',
  description TEXT NOT NULL,
  preferred_date DATE,
  preferred_time TEXT,
  urgency TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'emergency')),
  budget_type TEXT NOT NULL DEFAULT 'negotiable' CHECK (budget_type IN ('fixed', 'hourly', 'negotiable')),
  budget_amount INTEGER,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'inspection_scheduled', 'quoted', 'approved', 'scheduled', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS technician_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS time TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS job_type TEXT DEFAULT 'inspection';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS quoted_price INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS quote_details JSONB;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS quote_status TEXT DEFAULT 'pending';

UPDATE bookings
SET payment_status = CASE
  WHEN payment_status = 'unpaid' THEN 'pending'
  WHEN payment_status IS NULL THEN 'pending'
  ELSE payment_status
END
WHERE payment_status IS NULL OR payment_status = 'unpaid';

UPDATE bookings
SET job_type = 'inspection'
WHERE job_type IS NULL;

UPDATE bookings
SET quote_status = 'pending'
WHERE quote_status IS NULL;

DO $$
DECLARE
  existing_constraint TEXT;
BEGIN
  FOR existing_constraint IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'bookings'::regclass
      AND contype = 'c'
      AND (
        pg_get_constraintdef(oid) ILIKE '%status in (%'
        OR pg_get_constraintdef(oid) ILIKE '%job_type in (%'
        OR pg_get_constraintdef(oid) ILIKE '%quote_status in (%'
        OR pg_get_constraintdef(oid) ILIKE '%payment_status in (%'
      )
  LOOP
    EXECUTE format('ALTER TABLE bookings DROP CONSTRAINT IF EXISTS %I', existing_constraint);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'bookings'::regclass
      AND conname = 'bookings_status_check'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_status_check
      CHECK (status IN ('new', 'contacted', 'inspection_scheduled', 'quoted', 'approved', 'scheduled', 'in_progress', 'completed', 'cancelled'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'bookings'::regclass
      AND conname = 'bookings_job_type_check'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_job_type_check
      CHECK (job_type IN ('inspection', 'fixed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'bookings'::regclass
      AND conname = 'bookings_quote_status_check'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_quote_status_check
      CHECK (quote_status IN ('pending', 'quoted', 'approved', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'bookings'::regclass
      AND conname = 'bookings_payment_status_check'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_payment_status_check
      CHECK (payment_status IN ('pending', 'paid', 'failed'));
  END IF;
END;
$$;

ALTER TABLE bookings
  ALTER COLUMN payment_status SET DEFAULT 'pending',
  ALTER COLUMN job_type SET DEFAULT 'inspection',
  ALTER COLUMN quote_status SET DEFAULT 'pending';

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bookings' AND policyname = 'Anyone can create bookings'
  ) THEN
    CREATE POLICY "Anyone can create bookings"
      ON bookings FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bookings' AND policyname = 'Admins can view bookings'
  ) THEN
    CREATE POLICY "Admins can view bookings"
      ON bookings FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'support')
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bookings' AND policyname = 'Technicians can view assigned bookings'
  ) THEN
    CREATE POLICY "Technicians can view assigned bookings"
      ON bookings FOR SELECT
      USING (auth.uid() = technician_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bookings' AND policyname = 'Users can view their own bookings'
  ) THEN
    CREATE POLICY "Users can view their own bookings"
      ON bookings FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bookings' AND policyname = 'Users can update their own bookings'
  ) THEN
    CREATE POLICY "Users can update their own bookings"
      ON bookings FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bookings' AND policyname = 'Admins can update bookings'
  ) THEN
    CREATE POLICY "Admins can update bookings"
      ON bookings FOR UPDATE
      USING (EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'support')
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bookings' AND policyname = 'Technicians can update assigned bookings'
  ) THEN
    CREATE POLICY "Technicians can update assigned bookings"
      ON bookings FOR UPDATE
      USING (auth.uid() = technician_id);
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'status_update',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

UPDATE notifications
SET title = COALESCE(title, 'Notification')
WHERE title IS NULL;

UPDATE notifications
SET message = COALESCE(message, '')
WHERE message IS NULL;

UPDATE notifications
SET is_read = COALESCE(is_read, false)
WHERE is_read IS NULL;

UPDATE notifications
SET created_at = COALESCE(created_at, NOW())
WHERE created_at IS NULL;

ALTER TABLE notifications
  ALTER COLUMN is_read SET DEFAULT false,
  ALTER COLUMN is_read SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL;

UPDATE notifications
SET type = CASE
  WHEN type = 'booking_created' THEN 'booking_created'
  WHEN type = 'assigned' THEN 'assigned'
  WHEN type = 'status_update' THEN 'status_update'
  WHEN type = 'job' AND lower(COALESCE(title, '')) LIKE '%assignment%' THEN 'assigned'
  WHEN type = 'job' AND lower(COALESCE(title, '')) LIKE '%new booking%' THEN 'booking_created'
  ELSE 'status_update'
END;

ALTER TABLE notifications
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN message SET NOT NULL;

UPDATE notifications
SET type = 'status_update'
WHERE type IS NULL;

ALTER TABLE notifications
  ALTER COLUMN type SET DEFAULT 'status_update',
  ALTER COLUMN type SET NOT NULL;

DO $$
DECLARE
  existing_constraint TEXT;
BEGIN
  FOR existing_constraint IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'notifications'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%type%'
  LOOP
    EXECUTE format('ALTER TABLE notifications DROP CONSTRAINT IF EXISTS %I', existing_constraint);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'notifications'::regclass
      AND conname = 'notifications_type_check'
  ) THEN
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_type_check
      CHECK (type IN ('booking_created', 'assigned', 'status_update'));
  END IF;
END;
$$;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can view their own notifications'
  ) THEN
    CREATE POLICY "Users can view their own notifications"
      ON notifications FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Admins can view all notifications'
  ) THEN
    CREATE POLICY "Admins can view all notifications"
      ON notifications FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'support')
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'System can create notifications'
  ) THEN
    CREATE POLICY "System can create notifications"
      ON notifications FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can update their own notifications'
  ) THEN
    CREATE POLICY "Users can update their own notifications"
      ON notifications FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Admins can update notifications'
  ) THEN
    CREATE POLICY "Admins can update notifications"
      ON notifications FOR UPDATE
      USING (EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'support')
      ));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_bookings_updated_at'
  ) THEN
    CREATE TRIGGER update_bookings_updated_at
      BEFORE UPDATE ON bookings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_booking_notifications()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (user_id, title, message, type)
    SELECT
      id,
      'New Booking Request',
      COALESCE(NEW.customer_name, 'Customer') || ' created a booking for ' || COALESCE(NEW.service, NEW.service_name, 'a service') || '.',
      'booking_created'
    FROM profiles
    WHERE role IN ('admin', 'support');

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
    AND NEW.technician_id IS DISTINCT FROM OLD.technician_id
    AND NEW.technician_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      NEW.technician_id,
      'New Booking Assignment',
      'You have been assigned to a booking (' || NEW.id::text || ').',
      'assigned'
    );
  END IF;

  IF TG_OP = 'UPDATE'
    AND NEW.status IS DISTINCT FROM OLD.status
    AND NEW.user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      NEW.user_id,
      'Booking Status Updated',
      'Your booking status is now "' || NEW.status || '".',
      'status_update'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_booking_notification_event'
  ) THEN
    CREATE TRIGGER on_booking_notification_event
      AFTER INSERT OR UPDATE ON bookings
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_booking_notifications();
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_technician_id ON bookings(technician_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_quote_status ON bookings(quote_status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
