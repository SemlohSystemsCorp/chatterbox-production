-- Create a public storage bucket for message attachments
-- and set up RLS policies for authenticated users.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  true,
  10485760, -- 10MB
  ARRAY[
    --- Common image formats maybe only vidio/audio formats if we want to be more restrictive
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'text/plain', 'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',w
    'application/json',
    'video/mp4', 'video/quicktime',
    'audio/mpeg', 'audio/wav'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload attachments
CREATE POLICY "Authenticated users can upload attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'message-attachments');

-- Authenticated users can delete their own attachments
CREATE POLICY "Users can delete own attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND owner = auth.uid()
  );

-- Anyone can view attachments (bucket is public)
CREATE POLICY "Anyone can view attachments"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'message-attachments');
