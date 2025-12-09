-- Add username column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text;

-- Populate username from email (take the part before @)
UPDATE profiles 
SET username = split_part(email, '@', 1) 
WHERE username IS NULL;

-- Make username unique if needed, but for now just adding it is enough for display
-- We can add a constraint later if strictly required, but email is already unique
