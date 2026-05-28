-- Create storage bucket for school logos
INSERT INTO storage.buckets (id, name, public) VALUES ('school-logos', 'school-logos', true);

-- Allow public read access
CREATE POLICY "School logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'school-logos');

-- Allow authenticated users to upload their own logo
CREATE POLICY "Users can upload their own school logo"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'school-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to update their own logo
CREATE POLICY "Users can update their own school logo"
ON storage.objects FOR UPDATE
USING (bucket_id = 'school-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own logo
CREATE POLICY "Users can delete their own school logo"
ON storage.objects FOR DELETE
USING (bucket_id = 'school-logos' AND auth.uid()::text = (storage.foldername(name))[1]);