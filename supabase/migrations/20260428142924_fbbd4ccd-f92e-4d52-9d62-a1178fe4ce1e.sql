CREATE OR REPLACE FUNCTION public.get_my_report_credit_balance()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(credits), 0)::integer
  FROM public.report_credit_transactions
  WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.consume_my_report_credit()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance integer;
BEGIN
  SELECT public.get_my_report_credit_balance() INTO current_balance;

  IF current_balance <= 0 THEN
    RAISE EXCEPTION 'No report credits available';
  END IF;

  INSERT INTO public.report_credit_transactions (user_id, credits, reason)
  VALUES (auth.uid(), -1, 'essay_graded');

  RETURN current_balance - 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_report_credit_balance(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_report_credit_balance() FROM anon;
REVOKE ALL ON FUNCTION public.consume_my_report_credit() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_report_credit_balance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_my_report_credit() TO authenticated;