-- Definições de vídeo VSL do funil + bucket de storage

create table if not exists public.funnel_video_settings (
  slot text primary key
    check (slot in ('hero_intro', 'hero_social_proof')),
  video_path text,
  video_url text,
  cta_delay_seconds int not null default 45
    check (cta_delay_seconds >= 0 and cta_delay_seconds <= 3600),
  -- 1.0 = progresso linear; >1 = começa rápido e abranda no fim
  timeline_curve numeric not null default 2.2
    check (timeline_curve >= 1.0 and timeline_curve <= 5.0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.funnel_video_settings (slot, cta_delay_seconds, timeline_curve)
values
  ('hero_intro', 45, 2.2),
  ('hero_social_proof', 30, 2.2)
on conflict (slot) do nothing;

alter table public.funnel_video_settings enable row level security;

drop policy if exists admin_all_funnel_video on public.funnel_video_settings;
create policy admin_all_funnel_video on public.funnel_video_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Leitura pública só via API (service role). Sem política anon.

comment on table public.funnel_video_settings is
  'Configuração do vídeo VSL por slot do funil (URL, delay do CTA, curva da timeline).';
comment on column public.funnel_video_settings.timeline_curve is
  'Curva ease-out: 1=linear; valores maiores fazem a barra avançar rápido no início e lento no fim.';

-- Bucket público para vídeos do funil (leitura anónima; escrita só via service role)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'funnel-videos',
  'funnel-videos',
  true,
  104857600, -- 100 MB
  array['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists funnel_videos_public_read on storage.objects;
create policy funnel_videos_public_read on storage.objects
  for select to public
  using (bucket_id = 'funnel-videos');

drop policy if exists funnel_videos_admin_write on storage.objects;
create policy funnel_videos_admin_write on storage.objects
  for all to authenticated
  using (bucket_id = 'funnel-videos' and public.is_admin())
  with check (bucket_id = 'funnel-videos' and public.is_admin());
