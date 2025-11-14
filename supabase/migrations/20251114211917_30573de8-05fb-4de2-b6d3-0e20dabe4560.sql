-- Remove the unique constraint that prevents multiple alignments per day
ALTER TABLE daily_alignments 
DROP CONSTRAINT IF EXISTS daily_alignments_user_id_date_key;