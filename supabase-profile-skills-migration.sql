-- Ensure technician skills support exists on profiles table.
-- Safe to run multiple times.

ALTER TABLE IF EXISTS profiles
ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';
