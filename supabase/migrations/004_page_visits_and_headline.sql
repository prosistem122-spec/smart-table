-- Visitas anónimas (landing + vídeo) antes da captura de contacto
-- + texto editável por cima do VSL

create table if not exists public.page_visits (
  visit_id text primary key,
  landing_seen_at timestamptz,
  video_seen_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer text
);

create index if not exists page_visits_landing_idx
  on public.page_visits (landing_seen_at desc)
  where landing_seen_at is not null;

create index if not exists page_visits_video_idx
  on public.page_visits (video_seen_at desc)
  where video_seen_at is not null;

create index if not exists page_visits_last_seen_idx
  on public.page_visits (last_seen_at desc);

alter table public.page_visits enable row level security;

drop policy if exists admin_all_page_visits on public.page_visits;
create policy admin_all_page_visits on public.page_visits
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

comment on table public.page_visits is
  'Visitantes únicos (visit_id) na landing e no vídeo, sem PII — antes da captura de lead.';

-- Headline editável acima do VSL
alter table public.funnel_video_settings
  add column if not exists headline_html text;

comment on column public.funnel_video_settings.headline_html is
  'HTML do título acima do VSL (ex.: com <mark>). Null = texto padrão do funil.';
