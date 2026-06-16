
-- 1) Rate limiting table (service-only)
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('signin', 'reset')),
  attempts int NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (identifier, kind)
);
GRANT ALL ON public.auth_rate_limits TO service_role;
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role can read/write.

-- 2) Geofence columns on devices
ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS home_lat double precision,
  ADD COLUMN IF NOT EXISTS home_lng double precision,
  ADD COLUMN IF NOT EXISTS home_radius_m int NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS alert_email_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_alert_at timestamptz;

-- 3) Pending alerts queue
CREATE TABLE IF NOT EXISTS public.pending_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL,
  payload jsonb NOT NULL,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pending_alerts TO authenticated;
GRANT ALL ON public.pending_alerts TO service_role;
ALTER TABLE public.pending_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own alerts select" ON public.pending_alerts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 4) Haversine helper
CREATE OR REPLACE FUNCTION public.haversine_m(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
RETURNS double precision LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE r constant double precision := 6371000;
  dlat double precision; dlng double precision; a double precision;
BEGIN
  IF lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN RETURN NULL; END IF;
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  a := sin(dlat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng/2)^2;
  RETURN 2 * r * atan2(sqrt(a), sqrt(1 - a));
END $$;

-- 5) Geofence trigger: enqueue alert when lost/stolen device leaves zone
CREATE OR REPLACE FUNCTION public.check_geofence_on_position()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d record; dist double precision;
BEGIN
  SELECT id, user_id, alias, brand, model, status, home_lat, home_lng, home_radius_m,
         alert_email_enabled, last_alert_at
    INTO d FROM public.devices WHERE id = NEW.device_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF d.status NOT IN ('lost', 'stolen') THEN RETURN NEW; END IF;
  IF NOT d.alert_email_enabled THEN RETURN NEW; END IF;
  IF d.home_lat IS NULL OR d.home_lng IS NULL THEN RETURN NEW; END IF;
  IF d.last_alert_at IS NOT NULL AND d.last_alert_at > now() - interval '15 minutes' THEN RETURN NEW; END IF;

  dist := public.haversine_m(d.home_lat, d.home_lng, NEW.latitude, NEW.longitude);
  IF dist IS NULL OR dist <= d.home_radius_m THEN RETURN NEW; END IF;

  INSERT INTO public.pending_alerts (device_id, user_id, kind, payload)
  VALUES (d.id, d.user_id, 'geofence_exit', jsonb_build_object(
    'device_label', COALESCE(d.alias, d.brand || ' ' || d.model),
    'status', d.status,
    'latitude', NEW.latitude,
    'longitude', NEW.longitude,
    'distance_m', round(dist),
    'recorded_at', NEW.recorded_at
  ));
  UPDATE public.devices SET last_alert_at = now() WHERE id = d.id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_check_geofence ON public.positions;
CREATE TRIGGER trg_check_geofence
  AFTER INSERT ON public.positions
  FOR EACH ROW EXECUTE FUNCTION public.check_geofence_on_position();
