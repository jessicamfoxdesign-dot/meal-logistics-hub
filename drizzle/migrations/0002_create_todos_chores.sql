CREATE TABLE public.todos (
  id text PRIMARY KEY,
  seq bigint GENERATED ALWAYS AS IDENTITY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.todos TO authenticated;
GRANT ALL ON public.todos TO service_role;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allowed users full access" ON public.todos FOR ALL TO authenticated USING (public.is_allowed()) WITH CHECK (public.is_allowed());

CREATE TABLE public.chores (
  id text PRIMARY KEY,
  seq bigint GENERATED ALWAYS AS IDENTITY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chores TO authenticated;
GRANT ALL ON public.chores TO service_role;
ALTER TABLE public.chores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allowed users full access" ON public.chores FOR ALL TO authenticated USING (public.is_allowed()) WITH CHECK (public.is_allowed());