-- Create alignment_reflections table
CREATE TABLE public.alignment_reflections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alignment_id UUID NOT NULL REFERENCES public.daily_alignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  star_rating INTEGER NOT NULL CHECK (star_rating >= 1 AND star_rating <= 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.alignment_reflections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own reflections"
  ON public.alignment_reflections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reflections"
  ON public.alignment_reflections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reflections"
  ON public.alignment_reflections
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reflections"
  ON public.alignment_reflections
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_alignment_reflections_alignment_id ON public.alignment_reflections(alignment_id);
CREATE INDEX idx_alignment_reflections_user_id ON public.alignment_reflections(user_id);