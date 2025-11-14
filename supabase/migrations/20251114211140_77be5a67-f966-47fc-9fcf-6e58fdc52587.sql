-- Fix security warning by setting search_path on the function
CREATE OR REPLACE FUNCTION check_daily_alignment_limit()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;