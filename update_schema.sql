-- Add new columns to applications table
ALTER TABLE applications ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS marketing_type text;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_marketing_type ON applications(marketing_type);

-- Comment: Status values can be 'pending' (미완료) or 'completed' (완료)
-- Comment: Marketing types: 'blog-reporter', 'blog-experience', 'instagram-popular', 'etc'
