-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job that runs every minute to send scheduled notifications
-- This will call the send-scheduled-notifications edge function
SELECT cron.schedule(
  'send-scheduled-notifications',
  '* * * * *', -- Run every minute
  $$
  SELECT
    net.http_post(
      url := 'https://xhnwedejrifeccvtiefs.supabase.co/functions/v1/send-scheduled-notifications',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhobndlZGVqcmlmZWNjdnRpZWZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA1MTEzMCwiZXhwIjoyMDc4NjI3MTMwfQ.1LNuGvPp5aH3lQZMYLuXGjLmJbBvXHSPBxZXjqb-ABC"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);