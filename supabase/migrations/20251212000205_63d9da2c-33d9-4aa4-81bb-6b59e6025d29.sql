-- Create function to update timestamps if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table to store test notification timer states
CREATE TABLE public.test_notification_timers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  timer_key TEXT NOT NULL,
  next_notification_at TIMESTAMP WITH TIME ZONE NOT NULL,
  min_seconds INTEGER NOT NULL DEFAULT 30,
  max_seconds INTEGER NOT NULL DEFAULT 35,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_paused BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, timer_key)
);

-- Enable RLS
ALTER TABLE public.test_notification_timers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own timers" 
ON public.test_notification_timers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own timers" 
ON public.test_notification_timers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timers" 
ON public.test_notification_timers 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timers" 
ON public.test_notification_timers 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_test_notification_timers_updated_at
BEFORE UPDATE ON public.test_notification_timers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();