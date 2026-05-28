
CREATE TABLE public.essays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  subject TEXT,
  grade_level TEXT,
  feedback TEXT,
  score INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'grading', 'completed', 'error')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.essays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own essays" ON public.essays FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own essays" ON public.essays FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own essays" ON public.essays FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own essays" ON public.essays FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_essays_updated_at BEFORE UPDATE ON public.essays FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
