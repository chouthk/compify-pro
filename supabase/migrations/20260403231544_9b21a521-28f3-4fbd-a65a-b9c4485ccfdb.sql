
CREATE POLICY "Admins can view all essays"
ON public.essays FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
