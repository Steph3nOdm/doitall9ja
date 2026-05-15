-- Add client_type to profiles and keep signup profile inserts aligned.
-- Safe to run multiple times.

ALTER TABLE IF EXISTS profiles
ADD COLUMN IF NOT EXISTS client_type TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_client_type_check'
      AND conrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_client_type_check
      CHECK (
        client_type IS NULL OR client_type IN (
          'Home Owner',
          'Tenant',
          'Landlord',
          'Property Manager',
          'Business Owner',
          'Contractor',
          'Other'
        )
      );
  END IF;
END;
$$;

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
