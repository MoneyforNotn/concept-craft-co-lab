-- Add enabled field to notification_settings table
ALTER TABLE public.notification_settings 
ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT true;