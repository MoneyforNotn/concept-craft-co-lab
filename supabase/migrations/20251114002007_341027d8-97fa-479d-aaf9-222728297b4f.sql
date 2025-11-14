-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  personal_mission TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE
);

-- Create onboarding responses table
CREATE TABLE public.onboarding_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create daily alignments table
CREATE TABLE public.daily_alignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  intention TEXT NOT NULL,
  emotion TEXT NOT NULL,
  notes TEXT,
  is_bookmarked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create alignment images table (for photos from camera)
CREATE TABLE public.alignment_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alignment_id UUID REFERENCES public.daily_alignments(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification settings table
CREATE TABLE public.notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  frequency_count INTEGER DEFAULT 3,
  is_random BOOLEAN DEFAULT FALSE,
  scheduled_times TEXT[], -- Array of time strings like ["09:00", "13:00", "18:00"]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_alignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alignment_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for onboarding_responses
CREATE POLICY "Users can view own responses"
  ON public.onboarding_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own responses"
  ON public.onboarding_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for daily_alignments
CREATE POLICY "Users can view own alignments"
  ON public.daily_alignments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alignments"
  ON public.daily_alignments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alignments"
  ON public.daily_alignments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alignments"
  ON public.daily_alignments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for alignment_images
CREATE POLICY "Users can view own alignment images"
  ON public.alignment_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_alignments
      WHERE daily_alignments.id = alignment_images.alignment_id
      AND daily_alignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own alignment images"
  ON public.alignment_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.daily_alignments
      WHERE daily_alignments.id = alignment_images.alignment_id
      AND daily_alignments.user_id = auth.uid()
    )
  );

-- RLS Policies for notification_settings
CREATE POLICY "Users can view own settings"
  ON public.notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.notification_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for daily_alignments
CREATE TRIGGER update_daily_alignments_updated_at
  BEFORE UPDATE ON public.daily_alignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Trigger for notification_settings
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();