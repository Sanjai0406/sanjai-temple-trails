CREATE TABLE public.temple_photo_repairs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  temple_id uuid NOT NULL REFERENCES public.temples(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL CHECK (source IN ('cached_ref','search','manual_refresh')),
  success boolean NOT NULL,
  photo_uri text,
  error_message text,
  triggered_by text NOT NULL DEFAULT 'auto' CHECK (triggered_by IN ('auto','manual'))
);

CREATE INDEX temple_photo_repairs_temple_id_created_at_idx
  ON public.temple_photo_repairs (temple_id, created_at DESC);

GRANT SELECT ON public.temple_photo_repairs TO anon;
GRANT SELECT ON public.temple_photo_repairs TO authenticated;
GRANT ALL ON public.temple_photo_repairs TO service_role;

ALTER TABLE public.temple_photo_repairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view photo repair logs"
  ON public.temple_photo_repairs
  FOR SELECT
  USING (true);