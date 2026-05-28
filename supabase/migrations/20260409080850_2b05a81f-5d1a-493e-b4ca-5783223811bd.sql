
-- Create exemplar essays table for the model essay bank
CREATE TABLE public.exemplar_essays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  score INTEGER,
  subject TEXT,
  grade_level TEXT,
  exam_type TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exemplar_essays ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view exemplars
CREATE POLICY "Authenticated users can view exemplars"
ON public.exemplar_essays
FOR SELECT
TO authenticated
USING (true);

-- Users can insert their own exemplars
CREATE POLICY "Users can insert their own exemplars"
ON public.exemplar_essays
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own exemplars
CREATE POLICY "Users can update their own exemplars"
ON public.exemplar_essays
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own exemplars
CREATE POLICY "Users can delete their own exemplars"
ON public.exemplar_essays
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_exemplar_essays_updated_at
BEFORE UPDATE ON public.exemplar_essays
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
