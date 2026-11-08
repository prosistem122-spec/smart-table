-- URLs genéricos podem apontar a um ficheiro de vídeo ou a um player incorporável.
alter table public.funnel_video_settings
  add column if not exists video_source_mode text not null default 'auto'
  check (video_source_mode in ('auto', 'embed'));
