-- Remove the existing cron job with exposed service role key
SELECT cron.unschedule('send-scheduled-notifications');

-- Recreate the cron job using the anon key (which is already public/publishable)
-- The edge function already uses service role internally via Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
SELECT cron.schedule(
  'send-scheduled-notifications',
  '* * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://xhnwedejrifeccvtiefs.supabase.co/functions/v1/send-scheduled-notifications',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhobndlZGVqcmlmZWNjdnRpZWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNTExMzAsImV4cCI6MjA3ODYyNzEzMH0.22pZSCr3pcAJPv5Qq6Ia44jLiyyFOmGzAtg2Hf33hek"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);