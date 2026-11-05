"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { STEPS, CONTACT_FIELDS } from "@/components/funnel/steps";
import { KpiCard } from "@/components/admin/KpiCard";

type Answer = { question_key: string; answer: string; step_id: string; updated_at: string };
type Step = { step_id: string; duration_ms: number; updated_at: string };
type Data = { counts: Record<string, number>; restaurants: { visit_id: string; name: string; updated_at: string; lead_id: string | null; answers: Answer[]; steps: Step[] }[] };
const labels: Record<string, string> = { nome: "Nome do restaurante", tipo: "Tipo de restaurante", local: "Localização", faturacao: "Faturação mensal", mesas: "Mesas", calc_pct: "Simulação (%)", ...Object.fromEntries(CONTACT_FIELDS.map((f) => [f.key, f.label])) };
function stepLabel(id: string) {
  const step = STEPS.find((s) => s.id === id);
  return (step?.label || step?.kicker || step?.title || id.replace(/_/g, " ")).replace(/\{nome\}/g, "o restaurante").replace(/<[^>]*>/g, "");
}
function duration(ms: number) { const seconds = Math.round(ms / 1000); return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`; }
function date(value: string) { return new Date(value).toLocaleString("pt-MZ"); }

export default function TrackingPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const res = await fetch("/api/admin/journey", { cache: "no-store" }); const json = await res.json(); if (!res.ok) throw new Error(json.error || "Erro ao carregar"); setData(json); }
    catch (err) { setError(err instanceof Error ? err.message : "Erro ao carregar"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const c = data?.counts;
  const metrics = [
    ["1. Entrou na landing page", c?.landing],
    ["2. Clicou em começar grátis", c?.free_clicked_at],
    ["3. Abriu a página do vídeo", c?.video_page],
    ["4. Reproduziu a VSL", c?.video_played_at],
    ["5. Prosseguiu após a VSL", c?.video_continued_at],
    ["6. Clicou em iniciar análise", c?.analysis_clicked_at],
    ["7. Acedeu ao nome do restaurante", c?.name_step_seen_at],
  ] as const;
  return <>
    <header className="page-header"><div className="page-header-text"><h1 className="admin-title">Rastreamento</h1><p className="admin-sub">A jornada, desde a landing page até às respostas de cada restaurante.</p></div><button className="admin-btn ghost" onClick={() => void load()}>Actualizar</button></header>
    {error && <div className="alert error">{error}</div>}
    {loading && <p>A carregar…</p>}
    {data && <>
      <section className="panel"><div className="panel-head"><h2 className="panel-title">Percurso dos visitantes</h2></div>
        <p className="muted">Pessoas únicas por navegador; cada número conta quem realizou essa acção, mesmo que tenha chegado directamente. Abrir a página do vídeo não significa reproduzi-lo. Os novos cliques e reproduções são registados a partir desta actualização.</p>
        <div className="tracking-kpis">{metrics.map(([label, value]) => <KpiCard key={label} label={label} value={value ?? 0} />)}</div>
      </section>
      <section className="panel"><div className="panel-head"><h2 className="panel-title">Restaurantes e progresso</h2></div>
        <p className="muted">Até 100 nomes registados mais recentemente. As respostas parciais aparecem apenas quando a pessoa autoriza a captura na etapa do nome. Os tempos são aproximados e referem-se à última passagem registada por etapa.</p>
        {!data.restaurants.length && <p className="muted">Ainda não existem respostas com autorização.</p>}
        {data.restaurants.map((r) => {
          const allSteps = STEPS.filter((s) => r.steps.some((x) => x.step_id === s.id) || r.answers.some((a) => a.step_id === s.id));
          const latest = [...r.steps.map((s) => s.updated_at), ...r.answers.map((a) => a.updated_at)].sort().at(-1) || r.updated_at;
          return <details className="tracking-restaurant" key={r.visit_id}>
            <summary><strong>{r.name}</strong><span>Última actividade: {date(latest)} · Tempo registado: {duration(r.steps.reduce((n, s) => n + s.duration_ms, 0))}</span></summary>
            {r.lead_id && <p><Link href={`/admin/leads/${r.lead_id}`}>Ver ficha completa do cliente →</Link></p>}
            {!r.lead_id && <p className="muted">Ainda sem ficha de contacto associada.</p>}
            {allSteps.map((s) => { const time = r.steps.find((x) => x.step_id === s.id); const answers = r.answers.filter((a) => a.step_id === s.id); return <div className="tracking-step" key={s.id}>
              <strong>{stepLabel(s.id)}</strong> <span className="muted">{time ? `· ${duration(time.duration_ms)}` : "· tempo não registado"}</span>
              {answers.length > 0 && <ul>{answers.map((a) => <li key={a.question_key}><b>{labels[a.question_key] || (a.question_key.startsWith("quiz_") ? "Resposta" : a.question_key.replace(/_/g, " "))}:</b> {a.answer}</li>)}</ul>}
            </div>; })}
          </details>;
        })}
      </section>
    </>}
  </>;
}
