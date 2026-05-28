
-- Create classes table
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own classes" ON public.classes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own classes" ON public.classes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own classes" ON public.classes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own classes" ON public.classes FOR DELETE USING (auth.uid() = user_id);

-- Create class_students table
CREATE TABLE public.class_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  student_name TEXT NOT NULL,
  student_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own class students" ON public.class_students FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own class students" ON public.class_students FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own class students" ON public.class_students FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own class students" ON public.class_students FOR DELETE USING (auth.uid() = user_id);

-- Timestamp trigger for classes
CREATE TRIGGER update_classes_updated_at
BEFORE UPDATE ON public.classes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
