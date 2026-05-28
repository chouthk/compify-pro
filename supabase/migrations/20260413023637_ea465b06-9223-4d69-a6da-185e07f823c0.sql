
-- 1. Add unique constraints (skip if exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_codes_user_id_key') THEN
    ALTER TABLE public.referral_codes ADD CONSTRAINT referral_codes_user_id_key UNIQUE (user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_codes_code_key') THEN
    ALTER TABLE public.referral_codes ADD CONSTRAINT referral_codes_code_key UNIQUE (code);
  END IF;
END $$;

-- 2. Create get_my_referral_code RPC (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.get_my_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_code TEXT;
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  -- Check existing
  SELECT code INTO existing_code FROM public.referral_codes WHERE user_id = auth.uid();
  IF existing_code IS NOT NULL THEN
    RETURN existing_code;
  END IF;

  -- Generate unique code
  LOOP
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;

  INSERT INTO public.referral_codes (user_id, code) VALUES (auth.uid(), new_code);
  RETURN new_code;
END;
$$;

-- 3. Recreate trigger function for auto-generation on profile creation
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  -- Skip if code already exists for this user
  IF EXISTS (SELECT 1 FROM public.referral_codes WHERE user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;

  LOOP
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;

  INSERT INTO public.referral_codes (user_id, code) VALUES (NEW.user_id, new_code);
  RETURN NEW;
END;
$$;

-- 4. Attach trigger to profiles table
DROP TRIGGER IF EXISTS trg_generate_referral_code ON public.profiles;
CREATE TRIGGER trg_generate_referral_code
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.generate_referral_code();

-- 5. Backfill codes for existing users who don't have one
DO $$
DECLARE
  r RECORD;
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  FOR r IN SELECT user_id FROM public.profiles WHERE user_id NOT IN (SELECT user_id FROM public.referral_codes) LOOP
    LOOP
      new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
      SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    INSERT INTO public.referral_codes (user_id, code) VALUES (r.user_id, new_code);
  END LOOP;
END $$;
