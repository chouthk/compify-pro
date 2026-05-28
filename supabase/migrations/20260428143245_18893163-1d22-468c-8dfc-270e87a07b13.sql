CREATE OR REPLACE FUNCTION public.get_my_report_credit_balance()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(credits), 0)::integer
  FROM public.report_credit_transactions
  WHERE user_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.get_report_credit_balance(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_report_credit_balance() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.consume_my_report_credit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_report_credit_balance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_my_report_credit() TO authenticated;