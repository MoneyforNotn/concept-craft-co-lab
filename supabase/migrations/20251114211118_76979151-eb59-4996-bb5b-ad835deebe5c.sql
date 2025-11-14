-- Remove any unique constraint on date per user to allow multiple alignments per day
-- (There may not be one, but this ensures we can have multiple)

-- Add a check constraint to limit alignments to 2 per day per user
CREATE OR REPLACE FUNCTION check_daily_alignment_limit()
RETURNS TRIGGER AS $$
DECLARE
  alignment_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO alignment_count
  FROM daily_alignments
  WHERE user_id = NEW.user_id
  AND date = NEW.date
  AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  IF alignment_count >= 2 THEN
    RAISE EXCEPTION 'Maximum of 2 alignments per day allowed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce the limit
DROP TRIGGER IF EXISTS enforce_daily_alignment_limit ON daily_alignments;
CREATE TRIGGER enforce_daily_alignment_limit
  BEFORE INSERT OR UPDATE ON daily_alignments
  FOR EACH ROW
  EXECUTE FUNCTION check_daily_alignment_limit();