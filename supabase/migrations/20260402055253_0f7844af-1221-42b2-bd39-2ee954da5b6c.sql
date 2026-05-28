
-- Referral codes table
CREATE TABLE public.referral_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referral code"
ON public.referral_codes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can look up a referral code"
ON public.referral_codes FOR SELECT
TO anon, authenticated
USING (true);

-- Referral rewards table
CREATE TABLE public.referral_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id UUID NOT NULL,
  referred_user_id UUID NOT NULL,
  code_used TEXT NOT NULL,
  reward_days INTEGER NOT NULL DEFAULT 7,
  reward_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reward_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referral rewards"
ON public.referral_rewards FOR SELECT
TO authenticated
USING (auth.uid() = referrer_user_id);

-- Function to generate a unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  INSERT INTO public.referral_codes (user_id, code)
  VALUES (NEW.user_id, new_code);
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate referral code on profile creation
CREATE TRIGGER generate_referral_code_on_signup
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.generate_referral_code();
