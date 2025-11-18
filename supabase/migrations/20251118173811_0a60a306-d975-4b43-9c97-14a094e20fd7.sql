
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension  
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the function to run every minute
SELECT cron.schedule(
  'send-scheduled-notifications',
  '* * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://xhnwedejrifeccvtiefs.supabase.co/functions/v1/send-scheduled-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhobndlZGVqcmlmZWNjdnRpZWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNTExMzAsImV4cCI6MjA3ODYyNzEzMH0.22pZSCr3pcAJPv5Qq6Ia44jLiyyFOmGzAtg2Hf33hek"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
