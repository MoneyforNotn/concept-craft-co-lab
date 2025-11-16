-- Make user_id columns NOT NULL to prevent RLS bypass

-- Update any existing NULL values (if any) before altering the column
-- This is a safety measure, but ideally there should be no NULL values
UPDATE onboarding_responses SET user_id = auth.uid() WHERE user_id IS NULL;
UPDATE daily_alignments SET user_id = auth.uid() WHERE user_id IS NULL;
UPDATE notification_settings SET user_id = auth.uid() WHERE user_id IS NULL;

-- Alter columns to NOT NULL
ALTER TABLE onboarding_responses ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE daily_alignments ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE notification_settings ALTER COLUMN user_id SET NOT NULL;