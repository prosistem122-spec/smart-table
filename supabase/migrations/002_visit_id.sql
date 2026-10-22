-- Associação explícita entre visita anónima (página de vendas) e sessão identificada
-- Compatível com dados existentes: coluna nullable.

alter table public.sessions
  add column if not exists visit_id text;

create index if not exists sessions_visit_id_idx
  on public.sessions (visit_id)
  where visit_id is not null;

comment on column public.sessions.visit_id is
  'Identificador anónimo da visita à página de vendas, associado no momento da identificação do lead.';
