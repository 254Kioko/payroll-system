-- Add owner_id column
ALTER TABLE public.guest_registrations
  ADD COLUMN IF NOT EXISTS owner_id uuid;

CREATE INDEX IF NOT EXISTS idx_guest_registrations_owner_id
  ON public.guest_registrations(owner_id);

-- Drop old policies
DROP POLICY IF EXISTS "Admins can delete guest registrations" ON public.guest_registrations;
DROP POLICY IF EXISTS "Admins can view guest registrations" ON public.guest_registrations;
DROP POLICY IF EXISTS "Anyone can submit guest registration" ON public.guest_registrations;

-- New tenant-scoped policies
CREATE POLICY "Owners view own guest registrations"
  ON public.guest_registrations
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owners delete own guest registrations"
  ON public.guest_registrations
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Public submission: anyone (anon or authenticated) can insert,
-- but owner_id must be provided (the link encodes which BnB).
CREATE POLICY "Public can submit guest registration with owner"
  ON public.guest_registrations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (owner_id IS NOT NULL);
