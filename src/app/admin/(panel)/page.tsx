"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { STEP_IDS } from "@/types";

interface Metrics {
  totals: {
    leads: number;
    unique_visitors: number;
    sessions: number;
    analyses_started: number;
    analyses_completed: number;
    completion_rate: number;
    inactive: number;
    whatsapp_clicks: number;
    contact_requests: number;
  };
  top_sources: { name: string; count: number }[];
  drop_off: {
    step_id: string;
    reached: number;
    progressed: number;
    drop_pct: number;
    median_duration_ms: number | null;
    note?: string;
  }[];
  recent_activity: {
    id: string;
    event_name: string;
    occurred_at: string;
    step_id: string | null;
    element_name: string | null;
    lead_id: string;
    leads?: { restaurant_name?: string } | { restaurant_name?: string }[] | null;
  }[];
  timeline: { date: string; leads: number; completed: number; whatsapp: number }[];
  inactivity_rule: string;
}

const emptyMetrics: Metrics = {
  totals: {
    leads: 0,
    unique_visitors: 0,
    sessions: 0,
    analyses_started: 0,
    analyses_completed: 0,
    completion_rate: 0,
    inactive: 0,
    whatsapp_clicks: 0,
    contact_requests: 0,
  },
  top_sources: [],
  drop_off: [],
  recent_activity: [],
  timeline: [],
  inactivity_rule: "",
};

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [source, setSource] = useState("");
  const [campaign, setCampaign] = useState("");
  const [navigationStatus, setNavigationStatus] = useState("");
  const [step, setStep] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const sp = new URLSearchParams();
    if (from) sp.set("from", new Date(from).toISOString());
    if (to) sp.set("to", new Date(to + "T23:59:59").toISOString());
    if (source) sp.set("source", source);
    if (campaign) sp.set("campaign", campaign);
    if (navigationStatus) sp.set("navigation_status", navigationStatus);
    if (step) sp.set("step", step);
    try {
      const res = await fetch(`/api/admin/metrics?${sp.toString()}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Erro ${res.status}`);
      }
      setMetrics(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar");
      setMetrics(emptyMetrics);
    } finally {
      setLoading(false);
    }
  }, [from, to, source, campaign, navigationStatus, step]);

  useEffect(() => {
    void load();
  }, [load]);

  const t = metrics.totals;
  const worst = [...metrics.drop_off]
    .filter((d) => d.reached > 0)
    .sort((a, b) => b.drop_pct - a.drop_pct)[0];

  return (
    <>
      <h1 className="admin-title">Inteligência Comercial — Smart Table</h1>
      <p className="admin-sub">
        Indicadores calculados a partir da base de dados. {metrics.inactivity_rule}
      </p>

      <div className="filters">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <input
          placeholder="Origem / utm_source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
        <input
          placeholder="Campanha"
          value={campaign}
          onChange={(e) => setCampaign(e.target.value)}
        />
        <select
          value={navigationStatus}
          onChange={(e) => setNavigationStatus(e.target.value)}
        >
          <option value="">Estado de navegação</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
          <option value="analise_concluida">Análise concluída</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="contacto_pedido">Contacto pedido</option>
          <option value="desconhecido">Desconhecido</option>
        </select>
        <select value={step} onChange={(e) => setStep(e.target.value)}>
          <option value="">Etapa</option>
          {STEP_IDS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="button" className="admin-btn" onClick={() => void load()}>
          Aplicar
        </button>
      </div>

      {error && (
        <div className="panel" style={{ color: "#C2492E" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="empty">A carregar indicadores…</div>
      ) : (
        <>
          <div className="kpi-grid">
            <Kpi label="Potenciais clientes" value={t.leads} />
            <Kpi label="Visitantes únicos" value={t.unique_visitors} />
            <Kpi label="Sessões" value={t.sessions} />
            <Kpi label="Análises iniciadas" value={t.analyses_started} />
            <Kpi label="Análises concluídas" value={t.analyses_completed} />
            <Kpi label="Taxa de conclusão" value={`${t.completion_rate}%`} />
            <Kpi label="Visitantes inativos" value={t.inactive} />
            <Kpi label="Cliques WhatsApp" value={t.whatsapp_clicks} />
            <Kpi label="Pedidos de contacto" value={t.contact_requests} />
          </div>

          <div className="panel">
            <h2>Etapa com maior desistência estimada</h2>
            {worst ? (
              <p>
                <strong>{worst.step_id}</strong> — {worst.drop_pct}% não
                avançaram ({worst.reached} alcançaram, {worst.progressed}{" "}
                progrediram). Tempo mediano:{" "}
                {worst.median_duration_ms != null
                  ? `${Math.round(worst.median_duration_ms / 1000)}s`
                  : "n/d"}
                . Regra: inatividade ≠ abandono definitivo.
              </p>
            ) : (
              <p className="muted">Sem dados suficientes.</p>
            )}
          </div>

          <div className="panel">
            <h2>Funil por etapa (leads únicos)</h2>
            {metrics.drop_off.length === 0 ? (
              <div className="empty">Sem eventos registados.</div>
            ) : (
              <div className="bars">
                {metrics.drop_off.map((d) => (
                  <div className="bar-row" key={d.step_id}>
                    <span>{d.step_id}</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${Math.min(100, d.reached ? 100 - d.drop_pct : 0)}%`,
                        }}
                      />
                    </div>
                    <span>{d.reached}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel">
            <h2>Principais origens</h2>
            {metrics.top_sources.length === 0 ? (
              <p className="muted">Sem origens registadas (0).</p>
            ) : (
              <ul>
                {metrics.top_sources.map((s) => (
                  <li key={s.name}>
                    {s.name}: <strong>{s.count}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel">
            <h2>Evolução das conversões</h2>
            {metrics.timeline.length === 0 ? (
              <p className="muted">Sem dados no período.</p>
            ) : (
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Leads</th>
                      <th>Concluídos</th>
                      <th>WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.timeline.map((row) => (
                      <tr key={row.date}>
                        <td>{row.date}</td>
                        <td>{row.leads}</td>
                        <td>{row.completed}</td>
                        <td>{row.whatsapp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="panel">
            <h2>Atividade recente</h2>
            {metrics.recent_activity.length === 0 ? (
              <div className="empty">Ainda não há eventos.</div>
            ) : (
              <ul className="timeline">
                {metrics.recent_activity.map((ev) => {
                  const leadName = Array.isArray(ev.leads)
                    ? ev.leads[0]?.restaurant_name
                    : ev.leads?.restaurant_name;
                  return (
                    <li key={ev.id}>
                      <div className="time">
                        {new Date(ev.occurred_at).toLocaleString("pt-MZ")}
                      </div>
                      <div className="desc">
                        <Link href={`/admin/leads/${ev.lead_id}`}>
                          {leadName || "Restaurante"}
                        </Link>{" "}
                        — {ev.event_name}
                        {ev.step_id ? ` · ${ev.step_id}` : ""}
                        {ev.element_name ? ` · ${ev.element_name}` : ""}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}
