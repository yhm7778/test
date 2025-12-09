-- Add new columns to applications table
ALTER TABLE applications 
ADD COLUMN completion_date TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE,
ADD COLUMN files_deleted BOOLEAN DEFAULT FALSE;

-- Create an index for the cleanup job
CREATE INDEX idx_applications_completion_date ON applications(completion_date);
