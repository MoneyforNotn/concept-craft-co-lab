-- Add hide_streak_progress column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hide_streak_progress boolean DEFAULT false;