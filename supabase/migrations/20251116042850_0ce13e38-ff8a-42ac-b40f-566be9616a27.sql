-- Add show_quotes preference to profiles table
ALTER TABLE public.profiles 
ADD COLUMN show_quotes boolean DEFAULT true;