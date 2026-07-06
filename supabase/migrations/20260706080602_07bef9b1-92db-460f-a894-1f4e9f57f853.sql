
-- 1) app_admins (no RLS policies -> locked from clients)
CREATE TABLE public.app_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_admins TO service_role;
ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;

INSERT INTO public.app_admins (user_id)
VALUES ('ac4f98be-0062-4fe3-a23d-5a58c0855091')
ON CONFLICT (user_id) DO NOTHING;

-- 2) is_app_admin()
CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.app_admins WHERE user_id = auth.uid())
$$;
GRANT EXECUTE ON FUNCTION public.is_app_admin() TO authenticated;

-- 3) Admin read policies (added, existing kept)
CREATE POLICY "admin read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_app_admin());

CREATE POLICY "admin read all devices" ON public.devices
  FOR SELECT TO authenticated USING (public.is_app_admin());

CREATE POLICY "admin read all positions" ON public.positions
  FOR SELECT TO authenticated USING (public.is_app_admin());

CREATE POLICY "admin read all pending_alerts" ON public.pending_alerts
  FOR SELECT TO authenticated USING (public.is_app_admin());

-- 4) page_views
CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL CHECK (char_length(path) BETWEEN 1 AND 512),
  referrer text CHECK (referrer IS NULL OR char_length(referrer) <= 1024),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.page_views TO anon, authenticated;
GRANT SELECT ON public.page_views TO authenticated;
GRANT ALL ON public.page_views TO service_role;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can insert page views" ON public.page_views
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admin read page views" ON public.page_views
  FOR SELECT TO authenticated USING (public.is_app_admin());

CREATE INDEX page_views_created_at_idx ON public.page_views (created_at DESC);
CREATE INDEX page_views_path_idx ON public.page_views (path);

-- 5) support_messages
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text CHECK (name IS NULL OR char_length(name) <= 200),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 320 AND position('@' in email) > 1),
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 300),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 5000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','replied','closed')),
  admin_reply text CHECK (admin_reply IS NULL OR char_length(admin_reply) <= 10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  replied_at timestamptz
);
GRANT INSERT ON public.support_messages TO anon, authenticated;
GRANT SELECT, UPDATE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can send support message" ON public.support_messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'open'
    AND admin_reply IS NULL
    AND replied_at IS NULL
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "owner read own support message" ON public.support_messages
  FOR SELECT TO authenticated USING (user_id IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "admin read all support messages" ON public.support_messages
  FOR SELECT TO authenticated USING (public.is_app_admin());

CREATE POLICY "admin update support messages" ON public.support_messages
  FOR UPDATE TO authenticated USING (public.is_app_admin()) WITH CHECK (public.is_app_admin());

CREATE INDEX support_messages_created_at_idx ON public.support_messages (created_at DESC);
CREATE INDEX support_messages_status_idx ON public.support_messages (status);
