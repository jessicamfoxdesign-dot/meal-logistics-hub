CREATE TABLE public.date_notes (
  id text PRIMARY KEY,
  seq bigint GENERATED ALWAYS AS IDENTITY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.date_notes TO authenticated;
GRANT ALL ON public.date_notes TO service_role;
ALTER TABLE public.date_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allowed users full access" ON public.date_notes FOR ALL TO authenticated USING (public.is_allowed()) WITH CHECK (public.is_allowed());