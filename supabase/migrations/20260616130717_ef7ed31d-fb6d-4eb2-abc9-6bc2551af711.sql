
ALTER FUNCTION public.haversine_m(double precision, double precision, double precision, double precision) SET search_path = public;
REVOKE ALL ON FUNCTION public.check_geofence_on_position() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.haversine_m(double precision, double precision, double precision, double precision) FROM PUBLIC, anon, authenticated;
