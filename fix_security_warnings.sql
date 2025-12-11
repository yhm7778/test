-- 1. Enable RLS on public.staff_requests table
ALTER TABLE public.staff_requests ENABLE ROW LEVEL SECURITY;
-- 2. Create Policies for staff_requests
-- Allow authenticated users to insert requests
-- (Users can submit a request with their email)
CREATE POLICY "Allow authenticated users to insert requests" ON public.staff_requests FOR
INSERT TO authenticated WITH CHECK (true);
-- Allow admins to view all requests
CREATE POLICY "Allow admins to view all requests" ON public.staff_requests FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = auth.uid()
                AND profiles.role = 'admin'
        )
    );
-- Allow users to view their own requests (Matching by Email)
-- Since staff_requests doesn't have user_id, we check if the request email matches the user's profile email.
CREATE POLICY "Allow users to view own requests" ON public.staff_requests FOR
SELECT TO authenticated USING (
        email = (
            SELECT email
            FROM public.profiles
            WHERE id = auth.uid()
        )
    );
-- 3. Fix Function Search Path Mutable for handle_new_user
ALTER FUNCTION public.handle_new_user()
SET search_path = public;