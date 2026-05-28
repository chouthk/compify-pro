
CREATE POLICY "Admins can view all contact leads"
ON public.contact_leads FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete contact leads"
ON public.contact_leads FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
