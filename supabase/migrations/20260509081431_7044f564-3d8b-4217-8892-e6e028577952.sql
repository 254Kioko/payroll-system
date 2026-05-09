CREATE TABLE public.guest_registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  id_number text NOT NULL,
  phone text NOT NULL,
  gender text NOT NULL,
  occupants integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.guest_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit guest registration"
ON public.guest_registrations
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view guest registrations"
ON public.guest_registrations
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete guest registrations"
ON public.guest_registrations
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));