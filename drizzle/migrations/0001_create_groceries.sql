CREATE TABLE public.groceries (
  id text PRIMARY KEY,
  seq bigint GENERATED ALWAYS AS IDENTITY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.groceries TO authenticated;
GRANT ALL ON public.groceries TO service_role;
ALTER TABLE public.groceries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allowed users full access" ON public.groceries FOR ALL TO authenticated USING (is_allowed()) WITH CHECK (is_allowed());