-- DIA Marketplace Platform - Supabase Database Setup
-- Run this in your Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('client', 'technician', 'admin', 'support')),
  client_type TEXT CHECK (client_type IN ('Home Owner', 'Tenant', 'Landlord', 'Property Manager', 'Business Owner', 'Contractor', 'Other')),
  avatar_url TEXT,
  address TEXT,
  city TEXT DEFAULT 'Lagos',
  state TEXT DEFAULT 'Lagos',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Technician-specific fields
  skills TEXT[] DEFAULT '{}',
  years_experience INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  rating DECIMAL(2,1) DEFAULT 5.0,
  total_jobs INTEGER DEFAULT 0,
  bio TEXT,
  verified BOOLEAN DEFAULT false,
  
  -- Client-specific fields
  preferred_location TEXT
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- JOBS TABLE
-- ============================================
CREATE TABLE jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  technician_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'reviewing', 'assigned', 'accepted', 'in_progress', 'completed', 'confirmed', 'cancelled', 'disputed')),
  
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  location TEXT DEFAULT 'Lagos',
  address TEXT NOT NULL,
  
  budget INTEGER,
  budget_type TEXT DEFAULT 'negotiable' CHECK (budget_type IN ('fixed', 'hourly', 'negotiable')),
  urgency TEXT DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'emergency')),
  
  preferred_date DATE,
  preferred_time TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  
  client_rating INTEGER CHECK (client_rating >= 1 AND client_rating <= 5),
  technician_rating INTEGER CHECK (technician_rating >= 1 AND technician_rating <= 5),
  client_review TEXT,
  technician_review TEXT
);

-- Enable RLS on jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Jobs RLS Policies
CREATE POLICY "Clients can view their own jobs"
  ON jobs FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Technicians can view assigned jobs"
  ON jobs FOR SELECT
  USING (auth.uid() = technician_id);

CREATE POLICY "Admins can view all jobs"
  ON jobs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'support')
  ));

CREATE POLICY "Clients can create jobs"
  ON jobs FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their own jobs"
  ON jobs FOR UPDATE
  USING (auth.uid() = client_id);

CREATE POLICY "Technicians can update assigned jobs"
  ON jobs FOR UPDATE
  USING (auth.uid() = technician_id);

CREATE POLICY "Admins can update all jobs"
  ON jobs FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'support')
  ));

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  chat_room_id UUID,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'system')),
  content TEXT NOT NULL,
  attachments TEXT[],
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Messages RLS Policies
CREATE POLICY "Users can view messages they're involved in"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  USING (auth.uid() = sender_id);

-- ============================================
-- CHAT ROOMS TABLE
-- ============================================
CREATE TABLE chat_rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  support_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  subject TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on chat_rooms
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

-- Chat Rooms RLS Policies
CREATE POLICY "Users can view their own chat rooms"
  ON chat_rooms FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = support_id);

CREATE POLICY "Admins can view all chat rooms"
  ON chat_rooms FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'support')
  ));

CREATE POLICY "Users can create chat rooms"
  ON chat_rooms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- JOB EVENTS TABLE (for timeline/activity log)
-- ============================================
CREATE TABLE job_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on job_events
ALTER TABLE job_events ENABLE ROW LEVEL SECURITY;

-- Job Events RLS Policies
CREATE POLICY "Job events are viewable by job participants"
  ON job_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM jobs 
    WHERE id = job_events.job_id 
    AND (client_id = auth.uid() OR technician_id = auth.uid())
  ));

CREATE POLICY "Admins can view all job events"
  ON job_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'support')
  ));

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'status_update' CHECK (type IN ('booking_created', 'assigned', 'status_update')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Notifications RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notifications"
  ON notifications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'support')
  ));

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update notifications"
  ON notifications FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'support')
  ));

-- ============================================
-- FRONTEND CONTENT TABLES
-- ============================================
CREATE TABLE services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT DEFAULT '#00C853',
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active services"
  ON services FOR SELECT
  USING (true);

CREATE TABLE technicians (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  rating DECIMAL(2,1) DEFAULT 5.0,
  experience TEXT NOT NULL,
  jobs_completed INTEGER DEFAULT 0,
  image_url TEXT NOT NULL,
  bio TEXT,
  skills TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active technicians"
  ON technicians FOR SELECT
  USING (true);

CREATE TABLE reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  location TEXT NOT NULL,
  service TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active reviews"
  ON reviews FOR SELECT
  USING (true);

CREATE TABLE bookings (
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

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view bookings"
  ON bookings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'support')
  ));

CREATE POLICY "Technicians can view assigned bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = technician_id);

CREATE POLICY "Admins can update bookings"
  ON bookings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'support')
  ));

CREATE POLICY "Technicians can update assigned bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = technician_id);

-- ============================================
-- SERVICE CATEGORIES TABLE
-- ============================================
CREATE TABLE service_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#00C853',
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO service_categories (name, slug, description, icon, color, order_index) VALUES
  ('Electrical Repairs', 'electrical', 'Wiring, fixtures, panels, and electrical troubleshooting', 'zap', '#EAB308', 1),
  ('Plumbing', 'plumbing', 'Leak repairs, pipe installation, drain cleaning, and bathroom fittings', 'droplets', '#3B82F6', 2),
  ('Carpentry', 'carpentry', 'Custom furniture, repairs, installations, and woodwork finishing', 'hammer', '#F59E0B', 3),
  ('Painting', 'painting', 'Interior and exterior painting, wall preparation, and finishing touches', 'paintbrush', '#EC4899', 4),
  ('AC Installation & Repair', 'ac', 'Air conditioning installation, maintenance, and repair services', 'wind', '#06B6D4', 5),
  ('Appliance Repair', 'appliance', 'Washing machines, refrigerators, ovens, and home appliance fixes', 'refrigerator', '#8B5CF6', 6);

-- Keep services table aligned with seeded service_categories
INSERT INTO services (name, slug, description, icon, color, order_index, is_active)
SELECT name, slug, description, icon, color, order_index, is_active
FROM service_categories
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for jobs
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for bookings
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for chat_rooms
CREATE TRIGGER update_chat_rooms_updated_at
  BEFORE UPDATE ON chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate booking notifications
CREATE OR REPLACE FUNCTION public.handle_booking_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- New booking created: notify all admins/support users.
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

  -- Technician assignment changed: notify assigned technician.
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

  -- Booking status changed: notify customer.
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

-- Trigger to fire booking notifications
CREATE TRIGGER on_booking_notification_event
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_notifications();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role, client_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    NULLIF(NEW.raw_user_meta_data->>'client_type', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_jobs_client_id ON jobs(client_id);
CREATE INDEX idx_jobs_technician_id ON jobs(technician_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_services_slug ON services(slug);
CREATE INDEX idx_services_active_order ON services(is_active, order_index);
CREATE INDEX idx_technicians_active_order ON technicians(is_active, order_index);
CREATE INDEX idx_reviews_active_order ON reviews(is_active, order_index);
CREATE INDEX idx_bookings_service_id ON bookings(service_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_technician_id ON bookings(technician_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);
CREATE INDEX idx_messages_job_id ON messages(job_id);
CREATE INDEX idx_messages_chat_room_id ON messages(chat_room_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_job_events_job_id ON job_events(job_id);

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================
-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE services;
ALTER PUBLICATION supabase_realtime ADD TABLE technicians;
ALTER PUBLICATION supabase_realtime ADD TABLE reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
