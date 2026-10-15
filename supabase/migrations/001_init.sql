-- Smart Table — schema inicial (PostgreSQL / Supabase)
-- Aplicar no SQL Editor do Supabase ou via CLI: supabase db push

create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type commercial_status as enum (
    'novo',
    'por_contactar',
    'contactado',
    'em_negociacao',
    'convertido',
    'sem_interesse'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type session_activity_status as enum (
    'active',
    'inactive',
    'unknown'
  );
exception when duplicate_object then null;
end $$;

-- Potenciais clientes
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  restaurant_name text not null,
  phone_raw text not null,
  phone_normalized text not null,
  consent_analytics boolean not null default false,
  consent_contact boolean not null default false,
  commercial_status commercial_status not null default 'novo',
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer text,
  first_seen_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  last_page text,
  last_step text,
  last_step_index int,
  sessions_count int not null default 0,
  events_count int not null default 0,
  funnel_completed boolean not null default false,
  whatsapp_clicked boolean not null default false,
  contact_requested boolean not null default false,
  retention_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_phone_normalized_unique unique (phone_normalized)
);

create index if not exists leads_last_activity_idx on public.leads (last_activity_at desc);
create index if not exists leads_commercial_status_idx on public.leads (commercial_status);
create index if not exists leads_utm_source_idx on public.leads (utm_source);
create index if not exists leads_restaurant_name_idx on public.leads (restaurant_name);

-- Sessões
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  ended_at timestamptz,
  last_page text,
  last_step text,
  last_step_index int,
  activity_status session_activity_status not null default 'active',
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer text,
  user_agent text,
  consent_analytics boolean not null default false,
  resumed_from_session_id uuid references public.sessions(id),
  created_at timestamptz not null default now()
);

create index if not exists sessions_lead_id_idx on public.sessions (lead_id);
create index if not exists sessions_last_activity_idx on public.sessions (last_activity_at desc);

-- Eventos
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  event_name text not null,
  occurred_at timestamptz not null default now(),
  page text,
  step_id text,
  step_index int,
  element_name text,
  action text,
  value text,
  previous_page text,
  next_page text,
  duration_ms int,
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  consent_analytics boolean,
  metadata jsonb not null default '{}'::jsonb,
  dedupe_key text,
  created_at timestamptz not null default now(),
  constraint events_dedupe_unique unique (dedupe_key)
);

create index if not exists events_lead_occurred_idx on public.events (lead_id, occurred_at desc);
create index if not exists events_session_occurred_idx on public.events (session_id, occurred_at desc);
create index if not exists events_name_idx on public.events (event_name);
create index if not exists events_step_idx on public.events (step_id);

-- Respostas do funil
create table if not exists public.funnel_answers (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  question_key text not null,
  answer text not null,
  step_id text,
  recorded_at timestamptz not null default now(),
  constraint funnel_answers_session_question_unique unique (session_id, question_key)
);

create index if not exists funnel_answers_lead_idx on public.funnel_answers (lead_id);

-- Notas / acompanhamento comercial
create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  admin_user_id uuid not null references auth.users(id) on delete restrict,
  admin_email text,
  note text not null,
  previous_commercial_status commercial_status,
  new_commercial_status commercial_status,
  created_at timestamptz not null default now()
);

create index if not exists lead_notes_lead_idx on public.lead_notes (lead_id, created_at desc);

-- Perfis administrativos
create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

drop trigger if exists admin_profiles_set_updated_at on public.admin_profiles;
create trigger admin_profiles_set_updated_at
  before update on public.admin_profiles
  for each row execute function public.set_updated_at();

-- RLS: sem acesso público direto a PII; APIs usam service role
alter table public.leads enable row level security;
alter table public.sessions enable row level security;
alter table public.events enable row level security;
alter table public.funnel_answers enable row level security;
alter table public.lead_notes enable row level security;
alter table public.admin_profiles enable row level security;

-- Helper: utilizador é admin ativo
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_profiles ap
    where ap.user_id = auth.uid() and ap.is_active = true
  );
$$;

-- Políticas: apenas admins autenticados leem/escrevem via cliente anon+JWT
-- (APIs públicas usam service role e contornam RLS de forma controlada no servidor)

drop policy if exists admin_select_leads on public.leads;
create policy admin_select_leads on public.leads
  for select to authenticated
  using (public.is_admin());

drop policy if exists admin_update_leads on public.leads;
create policy admin_update_leads on public.leads
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists admin_select_sessions on public.sessions;
create policy admin_select_sessions on public.sessions
  for select to authenticated
  using (public.is_admin());

drop policy if exists admin_select_events on public.events;
create policy admin_select_events on public.events
  for select to authenticated
  using (public.is_admin());

drop policy if exists admin_select_answers on public.funnel_answers;
create policy admin_select_answers on public.funnel_answers
  for select to authenticated
  using (public.is_admin());

drop policy if exists admin_all_notes on public.lead_notes;
create policy admin_all_notes on public.lead_notes
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists admin_select_profiles on public.admin_profiles;
create policy admin_select_profiles on public.admin_profiles
  for select to authenticated
  using (public.is_admin() or user_id = auth.uid());

-- Sem políticas INSERT/SELECT para anon nas tabelas de PII
-- (bloqueia acesso público direto via PostgREST)

comment on table public.leads is 'Potenciais clientes (restaurantes). Acesso público apenas via API server-side.';
comment on table public.events is 'Eventos de analytics. Sem fingerprinting. Retenção configurável.';
comment on column public.leads.retention_until is 'Data limite de retenção; limpeza via job/cron documentado no README.';
