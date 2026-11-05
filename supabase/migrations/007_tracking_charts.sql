-- Separar uma visualização de etapa de uma duração efectivamente registada.
alter table public.tracking_steps
  add column if not exists duration_recorded boolean not null default true;

-- Agregação de todos os visitantes, não apenas dos 100 nomes apresentados na interface.
-- A última actividade é uma estimativa: não é prova de saída ou abandono.
create or replace function public.tracking_journey_chart_stats()
returns table (step_id text, reached bigint, timed_visits bigint, avg_duration_ms numeric, inactive_last bigint)
language sql stable security invoker set search_path = public as $$
  with activity as (
    select visit_id, step_id, updated_at from tracking_steps
    union all
    select visit_id, step_id, updated_at from tracking_answers
  ), latest as (
    select distinct on (visit_id) visit_id, step_id, updated_at
    from activity
    order by visit_id, updated_at desc, step_id
  ), inactive as (
    select step_id, count(*) as n from latest
    where updated_at < now() - interval '15 minutes'
      and step_id <> 'thanks_whatsapp'
    group by step_id
  ), per_step as (
    select a.step_id, count(*) as reached,
      count(*) filter (where s.duration_recorded) as timed_visits,
      avg(s.duration_ms) filter (where s.duration_recorded) as avg_duration_ms
    from (select distinct visit_id, step_id from activity) a
    left join tracking_steps s on s.visit_id = a.visit_id and s.step_id = a.step_id
    group by a.step_id
  )
  select p.step_id, p.reached, p.timed_visits, p.avg_duration_ms,
    coalesce(i.n, 0)::bigint as inactive_last
  from per_step p left join inactive i on i.step_id = p.step_id;
$$;
revoke all on function public.tracking_journey_chart_stats() from public, anon, authenticated;
grant execute on function public.tracking_journey_chart_stats() to service_role;
