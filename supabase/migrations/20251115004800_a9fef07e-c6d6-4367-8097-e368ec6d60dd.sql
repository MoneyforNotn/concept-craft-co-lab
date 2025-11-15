-- Add timezone field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN timezone TEXT DEFAULT 'local';

-- Add comment to explain the timezone column
COMMENT ON COLUMN public.profiles.timezone IS 'User timezone preference for alignment dates. "local" uses browser timezone, or IANA timezone string (e.g., "America/New_York")';