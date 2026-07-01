
-- Lock down auth_rate_limits: only service_role should access; revoke any client access
REVOKE ALL ON public.auth_rate_limits FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.auth_rate_limits TO service_role;

-- Add explicit restrictive policy denying any client access (defense in depth)
DROP POLICY IF EXISTS "Deny all client access to rate limits" ON public.auth_rate_limits;
CREATE POLICY "Deny all client access to rate limits"
  ON public.auth_rate_limits
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- pending_alerts: revoke write privileges from clients; only SELECT for authenticated remains
REVOKE INSERT, UPDATE, DELETE ON public.pending_alerts FROM anon, authenticated, PUBLIC;
GRANT SELECT ON public.pending_alerts TO authenticated;
GRANT ALL ON public.pending_alerts TO service_role;

-- Add explicit restrictive policies blocking client writes (defense in depth)
DROP POLICY IF EXISTS "Deny client inserts on pending_alerts" ON public.pending_alerts;
CREATE POLICY "Deny client inserts on pending_alerts"
  ON public.pending_alerts
  AS RESTRICTIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny client updates on pending_alerts" ON public.pending_alerts;
CREATE POLICY "Deny client updates on pending_alerts"
  ON public.pending_alerts
  AS RESTRICTIVE
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny client deletes on pending_alerts" ON public.pending_alerts;
CREATE POLICY "Deny client deletes on pending_alerts"
  ON public.pending_alerts
  AS RESTRICTIVE
  FOR DELETE
  TO anon, authenticated
  USING (false);
