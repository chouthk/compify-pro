CREATE TABLE public.report_credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  credits INTEGER NOT NULL,
  reason TEXT NOT NULL,
  stripe_session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.report_credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own report credit transactions"
ON public.report_credit_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all report credit transactions"
ON public.report_credit_transactions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.get_report_credit_balance(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(credits), 0)::integer
  FROM public.report_credit_transactions
  WHERE user_id = _user_id
$$;

CREATE INDEX idx_report_credit_transactions_user_id_created_at
ON public.report_credit_transactions(user_id, created_at DESC);

CREATE UNIQUE INDEX idx_report_credit_transactions_stripe_session_id
ON public.report_credit_transactions(stripe_session_id)
WHERE stripe_session_id IS NOT NULL;