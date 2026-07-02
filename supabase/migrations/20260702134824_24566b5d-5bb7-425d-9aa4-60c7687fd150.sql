CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Nettoie une éventuelle version précédente
DO $$ BEGIN
  PERFORM cron.unschedule('phonetrack-process-alerts');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'phonetrack-process-alerts',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--07d966f3-5640-4300-a526-678a6d13d724.lovable.app/api/public/process-alerts',
    headers := '{"Content-Type":"application/json","apikey":"sb_publishable_Aim56PZVYGECFhUMRQ4v7w_QNhJiGm9"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);