-- Uma confirmação por submissão; a função guarda respostas e estado na mesma transacção.
create table if not exists public.funnel_submissions (
  submission_id uuid primary key,
  lead_id uuid not null references public.leads(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  payload_hash text not null,
  created_at timestamptz not null default now()
);
alter table public.funnel_submissions enable row level security;

create or replace function public.complete_funnel_submission(
  p_submission_id uuid, p_lead_id uuid, p_session_id uuid, p_answers jsonb
) returns boolean language plpgsql security invoker set search_path = public as $$
declare existing public.funnel_submissions%rowtype; inserted boolean;
begin
  if not exists (select 1 from sessions where id = p_session_id and lead_id = p_lead_id) then
    raise exception 'Sessão inválida' using errcode = '22023';
  end if;
  insert into funnel_submissions (submission_id, lead_id, session_id, payload_hash)
    values (p_submission_id, p_lead_id, p_session_id, encode(sha256(convert_to(p_answers::text, 'UTF8')), 'hex'))
    on conflict (submission_id) do nothing;
  inserted := found;
  select * into existing from funnel_submissions where submission_id = p_submission_id for update;
  if existing.lead_id <> p_lead_id or existing.session_id <> p_session_id then
    raise exception 'Identificador já utilizado' using errcode = '22023';
  end if;
  -- Uma chave não pode confirmar um corpo diferente do que foi guardado.
  if existing.payload_hash <> encode(sha256(convert_to(p_answers::text, 'UTF8')), 'hex') then
    raise exception 'Submissão já confirmada com outros dados' using errcode = '23505';
  end if;
  -- Repetições não voltam a alterar dados já confirmados.
  if not inserted then
    return false;
  end if;
  insert into funnel_answers (lead_id, session_id, question_key, answer, step_id)
    select p_lead_id, p_session_id, a.question_key, a.answer, a.step_id
    from jsonb_to_recordset(p_answers) as a(question_key text, answer text, step_id text)
    on conflict (session_id, question_key) do update set answer = excluded.answer, step_id = excluded.step_id, recorded_at = now();
  update leads set funnel_completed = true, contact_requested = true,
    restaurant_name = coalesce((select a.answer from jsonb_to_recordset(p_answers) as a(question_key text, answer text) where a.question_key = 'nome' limit 1), restaurant_name),
    last_activity_at = now(), updated_at = now() where id = p_lead_id;
  update sessions set last_activity_at = now() where id = p_session_id;
  return true;
end;
$$;
revoke all on function public.complete_funnel_submission(uuid, uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.complete_funnel_submission(uuid, uuid, uuid, jsonb) to service_role;
