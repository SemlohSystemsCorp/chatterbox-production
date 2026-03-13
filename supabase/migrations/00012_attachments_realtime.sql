-- Enable realtime for the attachments table so file uploads
-- appear instantly for all users in a channel/conversation.
ALTER PUBLICATION supabase_realtime ADD TABLE public.attachments;
