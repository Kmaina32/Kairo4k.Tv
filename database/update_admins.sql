
-- 1. Update the function for FUTURE users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  site_rank text := 'Operator';
BEGIN
  -- Assign 'Admin' rank only to specific emails
  IF new.email IN ('gmaina424@gmail.com', 'nextrademarkets@gmail.com') THEN
    site_rank := 'Admin';
  END IF;

  INSERT INTO public.profiles (id, username, rank)
  VALUES (new.id, new.raw_user_meta_data->>'username', site_rank)
  -- If for some reason the profile exists, update it
  ON CONFLICT (id) DO UPDATE
  SET rank = EXCLUDED.rank;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update EXISTING users to Admin
UPDATE public.profiles
SET rank = 'Admin'
WHERE id IN (
    SELECT id FROM auth.users 
    WHERE email IN ('gmaina424@gmail.com', 'nextrademarkets@gmail.com')
);

-- 3. Demote any other users who might be Admin but shouldn't be
UPDATE public.profiles
SET rank = 'Operator'
WHERE id NOT IN (
    SELECT id FROM auth.users 
    WHERE email IN ('gmaina424@gmail.com', 'nextrademarkets@gmail.com')
) AND rank = 'Admin';
