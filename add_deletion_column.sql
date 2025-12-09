-- Add scheduled_deletion_at column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMPTZ NULL;

-- Add index for performance on cleanup queries
CREATE INDEX IF NOT EXISTS idx_profiles_scheduled_deletion_at 
ON public.profiles(scheduled_deletion_at);
