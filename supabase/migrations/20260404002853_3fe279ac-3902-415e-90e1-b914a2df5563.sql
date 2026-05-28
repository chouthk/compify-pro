-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all referral codes
CREATE POLICY "Admins can view all referral codes"
ON public.referral_codes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all referral rewards
CREATE POLICY "Admins can view all referral rewards"
ON public.referral_rewards
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));