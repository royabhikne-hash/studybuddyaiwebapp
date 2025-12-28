-- Create storage bucket for student photos
INSERT INTO storage.buckets (id, name, public) VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for uploading photos (authenticated users)
CREATE POLICY "Users can upload their own photo" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'student-photos' AND auth.uid() IS NOT NULL);

-- Create policy for public reading of photos
CREATE POLICY "Anyone can view student photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'student-photos');

-- Create policy for users to update their own photos
CREATE POLICY "Users can update their own photo" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'student-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Insert schools with hashed passwords
-- Note: Using simple password hash for demo purposes
INSERT INTO public.schools (name, school_id, password_hash, district, state)
VALUES 
  ('Delhi Public School, Kishanganj', 'dps855108', 'dpskne855108', 'Kishanganj', 'Bihar'),
  ('St. Xavier School', 'sxc855108', 'sxckne855018', 'Kishanganj', 'Bihar'),
  ('Bal Mandir School, Kishanganj', 'bms855108', 'bmskne855108', 'Kishanganj', 'Bihar'),
  ('Oriental Public School, Kishanganj', 'ops855108', 'opskne855108', 'Kishanganj', 'Bihar')
ON CONFLICT (school_id) DO NOTHING;

-- Update existing school if needed
UPDATE public.schools 
SET name = 'Insight Public School, Kishanganj', 
    password_hash = 'ipskne855108',
    district = 'Kishanganj',
    state = 'Bihar'
WHERE school_id = 'ips855108';