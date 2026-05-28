
CREATE TABLE public.contact_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  position TEXT NOT NULL,
  monthly_volume INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert contact leads"
  ON public.contact_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
