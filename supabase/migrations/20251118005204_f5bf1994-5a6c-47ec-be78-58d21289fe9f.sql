-- Add onesignal_player_id column to profiles table
ALTER TABLE public.profiles
ADD COLUMN onesignal_player_id text;