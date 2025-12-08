-- Add checklist_items column to daily_alignments table
-- Stores array of objects with text and checked status
ALTER TABLE public.daily_alignments 
ADD COLUMN checklist_items jsonb DEFAULT NULL;