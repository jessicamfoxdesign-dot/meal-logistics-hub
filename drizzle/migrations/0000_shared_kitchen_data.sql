create table public.allowed_emails (
  email text primary key,
  added_at timestamptz not null default now()
);
grant select, insert, delete on public.allowed_emails to authenticated;
grant all on public.allowed_emails to service_role;
alter table public.allowed_emails enable row level security;

create or replace function public.is_allowed()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.allowed_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;
grant execute on function public.is_allowed() to authenticated;

create policy "allowed read emails" on public.allowed_emails for select to authenticated using (public.is_allowed());
create policy "allowed add emails" on public.allowed_emails for insert to authenticated with check (public.is_allowed() and email = lower(trim(email)) and email <> '');
create policy "allowed remove emails" on public.allowed_emails for delete to authenticated using (public.is_allowed());

insert into public.allowed_emails (email) values ('jessicamfoxdesign@gmail.com');

do $$
declare t text;
begin
  foreach t in array array['meals','missions','equipment','plan_entries','needs'] loop
    execute format('create table public.%I (
      id text primary key,
      seq bigint generated always as identity,
      data jsonb not null,
      updated_at timestamptz not null default now()
    )', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "allowed users full access" on public.%I for all to authenticated using (public.is_allowed()) with check (public.is_allowed())', t);
  end loop;
end $$;