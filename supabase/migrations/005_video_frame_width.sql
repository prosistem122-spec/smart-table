-- Largura do enquadramento do VSL; a altura mantém a proporção 9:16.
alter table public.funnel_video_settings
  add column if not exists frame_width integer not null default 280
  check (frame_width between 160 and 500);
