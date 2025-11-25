-- Add hide_heatmap column to profiles table
ALTER TABLE profiles ADD COLUMN hide_heatmap boolean DEFAULT false;