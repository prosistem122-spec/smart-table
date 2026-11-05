-- Marcos anónimos e respostas facultativas por visitante, acessíveis apenas ao administrador.
create table if not exists public.tracking_milestones (
  visit_id text primary key,
  free_clicked_at timestamptz,
  video_played_at timestamptz,
  video_continued_at timestamptz,
  analysis_clicked_at timestamptz,
  name_step_seen_at timestamptz
);
create table if not exists public.tracking_answers (
  visit_id text not null,
  question_key text not null,
  answer text not null,
  step_id text not null,
  updated_at timestamptz not null default now(),
  primary key (visit_id, question_key)
);
create table if not exists public.tracking_steps (
  visit_id text not null,
  step_id text not null,
  duration_ms integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (visit_id, step_id)
);
alter table public.tracking_milestones enable row level security;
alter table public.tracking_answers enable row level security;
alter table public.tracking_steps enable row level security;
-- Escrita e leitura apenas pela API autenticada / service role; sem acesso anon directo.
create index if not exists tracking_answers_name_idx on public.tracking_answers (updated_at desc) where question_key = 'nome';
