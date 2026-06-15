
-- Function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- DEVICE STATUS ENUM
CREATE TYPE public.device_status AS ENUM ('safe', 'lost', 'stolen');

-- DEVICES
CREATE TABLE public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  imei TEXT NOT NULL UNIQUE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  alias TEXT,
  status public.device_status NOT NULL DEFAULT 'safe',
  legal_owner_confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT imei_format CHECK (imei ~ '^[0-9]{15}$')
);
CREATE INDEX idx_devices_user ON public.devices(user_id);
CREATE INDEX idx_devices_imei ON public.devices(imei);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devices TO authenticated;
GRANT ALL ON public.devices TO service_role;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own devices select" ON public.devices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own devices insert" ON public.devices FOR INSERT WITH CHECK (auth.uid() = user_id AND legal_owner_confirmed = true);
CREATE POLICY "own devices update" ON public.devices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own devices delete" ON public.devices FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_devices_updated BEFORE UPDATE ON public.devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- POSITIONS
CREATE TABLE public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_positions_device ON public.positions(device_id, recorded_at DESC);
GRANT SELECT, INSERT, DELETE ON public.positions TO authenticated;
GRANT ALL ON public.positions TO service_role;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own positions select" ON public.positions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.devices d WHERE d.id = device_id AND d.user_id = auth.uid()));
CREATE POLICY "own positions insert" ON public.positions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.devices d WHERE d.id = device_id AND d.user_id = auth.uid()));
CREATE POLICY "own positions delete" ON public.positions FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.devices d WHERE d.id = device_id AND d.user_id = auth.uid()));

-- Enable realtime on positions
ALTER PUBLICATION supabase_realtime ADD TABLE public.positions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.devices;

-- AUDIT LOGS (RGPD)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_user ON public.audit_logs(user_id, created_at DESC);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own audit select" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own audit insert" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
