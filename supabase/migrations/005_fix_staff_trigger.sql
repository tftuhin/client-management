-- ============================================================
-- Migration 005: Fix handle_new_user trigger
-- Ensures client users don't get staff records,
-- and backfills missing staff records for existing auth users.
-- Run this in your Supabase SQL editor.
-- ============================================================

-- 1. Update the trigger to skip client-type users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_count INTEGER;
  v_user_type TEXT;
BEGIN
  -- Skip clients — they should not get a staff record
  v_user_type := NEW.raw_user_meta_data->>'user_type';
  IF v_user_type = 'client' THEN
    RETURN NEW;
  END IF;

  -- First staff user becomes owner; subsequent users become members
  -- (invited users will have their role set via the invite-staff API)
  SELECT COUNT(*) INTO v_count FROM staff;
  IF v_count = 0 THEN
    v_role := 'owner';
  ELSE
    v_role := COALESCE(NEW.raw_user_meta_data->>'invited_role', 'member');
  END IF;

  INSERT INTO staff (id, full_name, email, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    v_role,
    true
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2. Backfill: insert staff records for existing auth users who don't have one
-- (skips client-type users)
INSERT INTO staff (id, full_name, email, role, is_active)
SELECT
  u.id,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  ),
  u.email,
  CASE
    WHEN (SELECT COUNT(*) FROM staff) = 0 THEN 'owner'
    ELSE COALESCE(u.raw_user_meta_data->>'invited_role', 'owner')
  END,
  true
FROM auth.users u
WHERE u.raw_user_meta_data->>'user_type' IS DISTINCT FROM 'client'
  AND NOT EXISTS (SELECT 1 FROM staff s WHERE s.id = u.id)
ON CONFLICT (id) DO NOTHING;
