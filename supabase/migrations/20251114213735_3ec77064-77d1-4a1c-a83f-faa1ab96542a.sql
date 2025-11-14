-- Create milestone_achievements table
CREATE TABLE public.milestone_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  milestone_days INTEGER NOT NULL,
  alignment_id UUID,
  achieved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, milestone_days),
  CONSTRAINT fk_alignment FOREIGN KEY (alignment_id) REFERENCES daily_alignments(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.milestone_achievements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own achievements" 
ON public.milestone_achievements 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements" 
ON public.milestone_achievements 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own achievements" 
ON public.milestone_achievements 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_milestone_achievements_user_id ON public.milestone_achievements(user_id);