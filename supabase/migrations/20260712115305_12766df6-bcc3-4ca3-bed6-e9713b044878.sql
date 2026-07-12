DROP POLICY IF EXISTS "Public can view photo repair logs" ON public.temple_photo_repairs;
REVOKE SELECT ON public.temple_photo_repairs FROM anon;