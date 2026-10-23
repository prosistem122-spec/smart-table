"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { STEP_IDS } from "@/types";
import { KpiCard } from "@/components/admin/KpiCard";
import {
  describeEvent,
  formatStepLabel,
  isHighlightEvent,
  labelEventName,
} from "@/lib/admin/event-labels";

interface Metrics {
  totals: {
    leads: number;
    unique_visitors: number;
    landing_visitors: number;
    video_visitors: number;
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
    progression_pct?: number;
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
    landing_visitors: 0,
    video_visitors: 0,
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

const ACTIVITY_PAGE = 8;

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
  const [activityShown, setActivityShown] = useState(ACTIVITY_PAGE);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

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
      setUpdatedAt(new Date());
      setActivityShown(ACTIVITY_PAGE);
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

  function clearFilters() {
    setFrom("");
    setTo("");
    setSource("");
    setCampaign("");
    setNavigationStatus("");
    setStep("");
  }

  const t = metrics.totals;
  const worst = [...metrics.drop_off]
    .filter((d) => d.reached > 0)
    .sort((a, b) => b.drop_pct - a.drop_pct)[0];

  const maxReached = useMemo(
    () => Math.max(1, ...metrics.drop_off.map((d) => d.reached), 1),
    [metrics.drop_off]
  );

  const sourceTotal = useMemo(
    () => metrics.top_sources.reduce((s, x) => s + x.count, 0) || 1,
    [metrics.top_sources]
  );

  const activity = metrics.recent_activity.slice(0, activityShown);

  return (
    <>
      <header className="page-header">
        <div className="page-header-text">
          <h1 className="admin-title">Inteligência Comercial</h1>
          <p className="admin-sub">
            Indicadores calculados a partir dos eventos registados no funil.
            Inactividade não equivale a abandono definitivo.
          </p>
        </div>
        {updatedAt && (
          <div className="page-meta">
            Actualizado{" "}
            {updatedAt.toLocaleString("pt-MZ", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
      </header>

      <div className="filters">
        <div className="filter-field">
          <label htmlFor="f-from">Data inicial</label>
          <input
            id="f-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="f-to">Data final</label>
          <input
            id="f-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="f-source">Origem</label>
          <input
            id="f-source"
            placeholder="utm_source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="f-campaign">Campanha</label>
          <input
            id="f-campaign"
            placeholder="utm_campaign"
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="f-nav">Navegação</label>
          <select
            id="f-nav"
            value={navigationStatus}
            onChange={(e) => setNavigationStatus(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="analise_concluida">Análise concluída</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="contacto_pedido">Contacto pedido</option>
            <option value="desconhecido">Desconhecido</option>
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="f-step">Etapa do funil</label>
          <select
            id="f-step"
            value={step}
            onChange={(e) => setStep(e.target.value)}
          >
            <option value="">Todas</option>
            {STEP_IDS.map((s) => (
              <option key={s} value={s}>
                {formatStepLabel(s)}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field filter-actions">
          <label aria-hidden>&nbsp;</label>
          <div className="filter-actions">
            <button type="button" className="admin-btn" onClick={() => void load()}>
              Aplicar
            </button>
            <button type="button" className="admin-btn ghost" onClick={clearFilters}>
              Limpar
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      {loading ? (
        <div className="empty">A carregar indicadores…</div>
      ) : (
        <>
          <div className="kpi-grid kpi-9">
            <KpiCard label="Visitantes na landing" value={t.landing_visitors} icon="visitors" />
            <KpiCard label="Visitantes no vídeo" value={t.video_visitors} icon="visitors" />
            <KpiCard label="Potenciais clientes" value={t.leads} icon="leads" />
            <KpiCard label="Visitantes únicos" value={t.unique_visitors} icon="visitors" />
            <KpiCard label="Sessões" value={t.sessions} icon="sessions" />
            <KpiCard label="Análises iniciadas" value={t.analyses_started} icon="started" />
            <KpiCard label="Análises concluídas" value={t.analyses_completed} icon="completed" />
            <KpiCard label="Taxa de conclusão" value={`${t.completion_rate}%`} icon="rate" />
            <KpiCard label="Visitantes inactivos" value={t.inactive} icon="inactive" />
            <KpiCard label="Cliques no WhatsApp" value={t.whatsapp_clicks} icon="whatsapp" />
            <KpiCard label="Pedidos de contacto" value={t.contact_requests} icon="contact" />
          </div>

          <div className="panel">
            <h2 className="panel-title">Etapa com maior desistência estimada</h2>
            {worst ? (
              <>
                <div className="dropoff-card">
                  <div className="dropoff-main">
                    <p className="dropoff-step">{formatStepLabel(worst.step_id)}</p>
                    <p className="dropoff-pct">{worst.drop_pct}%</p>
                    <p className="muted" style={{ margin: 0, fontSize: "0.82rem" }}>
                      utilizadores que não avançaram (estimativa)
                    </p>
                  </div>
                  <div className="dropoff-stat">
                    <span className="lbl">Alcançaram</span>
                    <span className="val">{worst.reached}</span>
                  </div>
                  <div className="dropoff-stat">
                    <span className="lbl">Progrediram</span>
                    <span className="val">{worst.progressed}</span>
                  </div>
                  <div className="dropoff-stat">
                    <span className="lbl">Tempo mediano</span>
                    <span className="val">
                      {worst.median_duration_ms != null
                        ? `${Math.round(worst.median_duration_ms / 1000)}s`
                        : "n/d"}
                    </span>
                  </div>
                </div>
                <div className="dropoff-disclaimer">
                  Desistência estimada ≠ abandono confirmado.{" "}
                  {metrics.inactivity_rule ||
                    "Visitantes inactivos não são classificados automaticamente como abandono definitivo."}
                </div>
              </>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                Sem dados suficientes.
              </p>
            )}
          </div>

          <div className="panel-grid">
            <div className="panel" style={{ marginBottom: 0 }}>
              <h2 className="panel-title">Funil por etapa</h2>
              <p className="panel-hint">Leads únicos por etapa, na sequência do funil.</p>
              {metrics.drop_off.length === 0 ? (
                <div className="empty">Sem eventos registados.</div>
              ) : (
                <div className="table-wrap">
                  <table className="funnel-table">
                    <thead>
                      <tr>
                        <th>Etapa</th>
                        <th className="num">Leads</th>
                        <th>Progressão</th>
                        <th className="num">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.drop_off.map((d) => {
                        const barPct = Math.round((d.reached / maxReached) * 100);
                        const prog =
                          d.progression_pct ??
                          (d.reached
                            ? Math.round((d.progressed / d.reached) * 1000) / 10
                            : 0);
                        const highDrop = d.reached > 0 && d.drop_pct >= 40;
                        return (
                          <tr
                            key={d.step_id}
                            className={highDrop ? "high-drop" : undefined}
                          >
                            <td>
                              <div className="funnel-step-name" title={d.step_id}>
                                {formatStepLabel(d.step_id)}
                              </div>
                            </td>
                            <td className="num">{d.reached}</td>
                            <td className="funnel-bar-cell">
                              <div className="bar-track">
                                <div
                                  className={`bar-fill${highDrop ? " warn" : ""}`}
                                  style={{ width: `${barPct}%` }}
                                />
                              </div>
                            </td>
                            <td className="num">{prog}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="panel" style={{ marginBottom: 0 }}>
              <h2 className="panel-title">Principais origens</h2>
              <p className="panel-hint">Origens que geram mais potenciais clientes.</p>
              {metrics.top_sources.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>
                  Sem origens registadas.
                </p>
              ) : (
                <ul className="source-list">
                  {metrics.top_sources.map((s) => {
                    const pct = Math.round((s.count / sourceTotal) * 100);
                    return (
                      <li key={s.name} className="source-item">
                        <span className="source-name">{s.name}</span>
                        <span className="source-count">{s.count}</span>
                        <span className="source-pct">{pct}%</span>
                        <div className="source-bar">
                          <span style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="panel" style={{ marginTop: 16 }}>
            <h2 className="panel-title">Evolução das conversões</h2>
            {metrics.timeline.length === 0 ? (
              <div className="empty">Sem dados no período.</div>
            ) : (
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th className="num">Leads</th>
                      <th className="num">Análises concluídas</th>
                      <th className="num">WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.timeline.map((row) => (
                      <tr key={row.date}>
                        <td className="strong">{row.date}</td>
                        <td className="num">{row.leads}</td>
                        <td className="num">{row.completed}</td>
                        <td className="num">{row.whatsapp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2 className="panel-title">Actividade recente</h2>
              <span className="muted" style={{ fontSize: "0.78rem" }}>
                {metrics.recent_activity.length} eventos
              </span>
            </div>
            {metrics.recent_activity.length === 0 ? (
              <div className="empty">Ainda não há eventos.</div>
            ) : (
              <>
                <ul className="timeline">
                  {activity.map((ev) => {
                    const leadName = Array.isArray(ev.leads)
                      ? ev.leads[0]?.restaurant_name
                      : ev.leads?.restaurant_name;
                    const when = new Date(ev.occurred_at);
                    return (
                      <li
                        key={ev.id}
                        className={`timeline-item${
                          isHighlightEvent(ev.event_name) ? " highlight" : ""
                        }`}
                      >
                        <div className="timeline-time">
                          {when.toLocaleTimeString("pt-MZ", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="timeline-rail">
                          <span className="timeline-dot" />
                        </div>
                        <div className="timeline-body">
                          <div className="timeline-title">
                            <Link href={`/admin/leads/${ev.lead_id}`}>
                              {leadName || "Restaurante"}
                            </Link>
                          </div>
                          <div className="timeline-desc">
                            {describeEvent({
                              event_name: ev.event_name,
                              step_id: ev.step_id,
                              element_name: ev.element_name,
                            })}
                          </div>
                          <div className="timeline-meta">
                            <span>{labelEventName(ev.event_name)}</span>
                            {ev.step_id && (
                              <span>{formatStepLabel(ev.step_id)}</span>
                            )}
                            <span>
                              {when.toLocaleDateString("pt-MZ", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {activityShown < metrics.recent_activity.length && (
                  <div style={{ marginTop: 12, textAlign: "center" }}>
                    <button
                      type="button"
                      className="admin-btn ghost sm"
                      onClick={() =>
                        setActivityShown((n) => n + ACTIVITY_PAGE)
                      }
                    >
                      Mostrar mais
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
