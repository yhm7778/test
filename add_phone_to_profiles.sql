-- Add phone number field to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
-- Add comment for documentation
COMMENT ON COLUMN public.profiles.phone IS '사용자 전화번호 (알림톡 발송용)';