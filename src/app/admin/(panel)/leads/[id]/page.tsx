"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  COMMERCIAL_STATUS_LABELS,
  NAVIGATION_STATUS_LABELS,
  STEP_IDS,
  type CommercialStatus,
  type NavigationStatus,
} from "@/types";
import { formatPhoneDisplay } from "@/lib/phone";
import { KpiCard } from "@/components/admin/KpiCard";
import {
  describeEvent,
  formatStepLabel,
  isHighlightEvent,
  labelEventName,
} from "@/lib/admin/event-labels";

interface ProfileData {
  lead: {
    id: string;
    restaurant_name: string;
    phone_normalized: string;
    phone_raw: string;
    created_at: string;
    source: string | null;
    utm_source: string | null;
    utm_campaign: string | null;
    commercial_status: CommercialStatus;
    navigation_status: NavigationStatus;
    first_seen_at: string;
    last_activity_at: string;
  };
  sessions: { id: string; started_at: string; last_activity_at: string }[];
  events: {
    id: string;
    event_name: string;
    occurred_at: string;
    step_id: string | null;
    element_name: string | null;
    action: string | null;
    value: string | null;
    session_id: string;
  }[];
  notes: {
    id: string;
    note: string;
    admin_email: string | null;
    created_at: string;
    previous_commercial_status: string | null;
    new_commercial_status: string | null;
  }[];
  behavioral: {
    sessions_count: number;
    events_count: number;
    completed_steps: string[];
    pending_steps: string[];
    last_activity_at: string;
    last_page: string | null;
    last_step: string | null;
    last_button: string | null;
    last_answer: string | null;
    funnel_completed: boolean;
    whatsapp_clicked: boolean;
    contact_requested: boolean;
    approx_interaction_ms: number;
    inactivity_rule: string;
  };
}

const TIMELINE_PAGE = 25;

export default function LeadProfilePage() {
  const params = useParams();
  const id = String(params.id);
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<CommercialStatus>("novo");
  const [note, setNote] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [timelineShown, setTimelineShown] = useState(TIMELINE_PAGE);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/leads/${id}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Erro ${res.status}`);
      }
      const json = (await res.json()) as ProfileData;
      setData(json);
      setStatus(json.lead.commercial_status);
      setTimelineShown(TIMELINE_PAGE);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const events = useMemo(() => {
    if (!data) return [];
    return data.events.filter((e) => {
      if (sessionFilter && e.session_id !== sessionFilter) return false;
      if (eventFilter && e.event_name !== eventFilter) return false;
      return true;
    });
  }, [data, sessionFilter, eventFilter]);

  const eventsByDay = useMemo(() => {
    const groups: { day: string; items: typeof events }[] = [];
    for (const ev of events.slice(0, timelineShown)) {
      const day = new Date(ev.occurred_at).toLocaleDateString("pt-MZ", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const last = groups[groups.length - 1];
      if (last && last.day === day) last.items.push(ev);
      else groups.push({ day, items: [ev] });
    }
    return groups;
  }, [events, timelineShown]);

  const currentStep = data?.behavioral.last_step || null;
  const completedSet = useMemo(
    () => new Set(data?.behavioral.completed_steps || []),
    [data]
  );

  async function saveStatus(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commercial_status: status,
          note: note || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Falha");
      }
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  async function addNoteOnly() {
    if (!note.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/leads/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error("Falha ao guardar nota");
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="empty">A carregar perfil…</div>;
  if (error && !data) {
    return (
      <div className="alert error">
        {error} · <Link href="/admin/leads">Voltar à lista</Link>
      </div>
    );
  }
  if (!data) return null;

  const { lead, behavioral } = data;
  const origin =
    [lead.utm_source || lead.source || "direto", lead.utm_campaign]
      .filter(Boolean)
      .join(" · ");

  return (
    <>
      <Link href="/admin/leads" className="back-link">
        ← Voltar à lista
      </Link>

      <div className="profile-header" style={{ marginTop: 10 }}>
        <div className="profile-header-top">
          <h1 className="admin-title">{lead.restaurant_name}</h1>
          <span className="badge ok">
            {COMMERCIAL_STATUS_LABELS[lead.commercial_status]}
          </span>
          <span className="badge">
            {NAVIGATION_STATUS_LABELS[lead.navigation_status] ||
              lead.navigation_status}
          </span>
        </div>
        <div className="profile-meta-row">
          <span>
            <strong>Telefone</strong>
            {formatPhoneDisplay(lead.phone_normalized)}
          </span>
          <span>
            <strong>Origem</strong>
            {origin}
          </span>
          <span>
            <strong>Criado</strong>
            {new Date(lead.created_at).toLocaleString("pt-MZ", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span>
            <strong>ID</strong>
            <code>{lead.id.slice(0, 8)}…</code>
          </span>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="panel">
        <h2 className="panel-title">Resumo comportamental</h2>
        <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <KpiCard label="Sessões" value={behavioral.sessions_count} icon="sessions" />
          <KpiCard label="Eventos" value={behavioral.events_count} icon="leads" />
          <KpiCard
            label="Interação aprox."
            value={`${Math.round(behavioral.approx_interaction_ms / 1000)}s`}
            icon="rate"
          />
        </div>
        <div className="fact-grid">
          <div className="fact">
            <span className="fact-label">Última actividade</span>
            <span className="fact-value">
              {new Date(behavioral.last_activity_at).toLocaleString("pt-MZ")}
            </span>
          </div>
          <div className="fact">
            <span className="fact-label">Última página</span>
            <span className="fact-value">{behavioral.last_page || "—"}</span>
          </div>
          <div className="fact">
            <span className="fact-label">Última etapa</span>
            <span className="fact-value">
              {behavioral.last_step
                ? formatStepLabel(behavioral.last_step)
                : "—"}
            </span>
          </div>
          <div className="fact">
            <span className="fact-label">Último botão</span>
            <span className="fact-value">{behavioral.last_button || "—"}</span>
          </div>
          <div className="fact">
            <span className="fact-label">Última resposta</span>
            <span className="fact-value">{behavioral.last_answer || "—"}</span>
          </div>
          <div className="fact">
            <span className="fact-label">Funil concluído</span>
            <span className="fact-value">
              {behavioral.funnel_completed ? "Sim" : "Não"}
            </span>
          </div>
          <div className="fact">
            <span className="fact-label">WhatsApp</span>
            <span className="fact-value">
              {behavioral.whatsapp_clicked ? "Clicou" : "Não clicou"}
            </span>
          </div>
          <div className="fact">
            <span className="fact-label">Contacto</span>
            <span className="fact-value">
              {behavioral.contact_requested ? "Pedido" : "Não pedido"}
            </span>
          </div>
        </div>
        <p className="muted" style={{ margin: "12px 0 0", fontSize: "0.78rem" }}>
          {behavioral.inactivity_rule}
        </p>
      </div>

      <div className="panel">
        <h2 className="panel-title">Etapas do funil</h2>
        <p className="panel-hint">
          Etapa actual identificada a partir dos eventos reais
          {currentStep ? `: ${formatStepLabel(currentStep)}` : " (ainda sem etapa)."}.
        </p>
        <div className="steps-board">
          <div className="steps-col">
            <h3>Concluídas</h3>
            <div className="step-chips">
              {behavioral.completed_steps.length === 0 ? (
                <span className="muted">Nenhuma</span>
              ) : (
                behavioral.completed_steps.map((s) => (
                  <span key={s} className="step-chip">
                    {formatStepLabel(s)}
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="steps-col">
            <h3>Pendentes</h3>
            <div className="step-chips">
              {STEP_IDS.filter((s) => !completedSet.has(s)).map((s) => (
                <span
                  key={s}
                  className={`step-chip${s === currentStep ? " current" : " pending"}`}
                >
                  {formatStepLabel(s)}
                  {s === currentStep ? " · actual" : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Acompanhamento comercial</h2>
        </div>
        <form onSubmit={saveStatus} className="filters filters-inline" style={{ marginBottom: 10 }}>
          <div className="filter-field" style={{ minWidth: 160, flex: "1 1 160px" }}>
            <label htmlFor="p-status">Estado comercial</label>
            <select
              id="p-status"
              className="admin-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as CommercialStatus)}
            >
              {Object.entries(COMMERCIAL_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-field" style={{ minWidth: 220, flex: "2 1 220px" }}>
            <label htmlFor="p-note">Nota</label>
            <input
              id="p-note"
              className="admin-input"
              placeholder="Nota da alteração ou acompanhamento"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="filter-actions" style={{ paddingBottom: 1 }}>
            <button className="admin-btn" type="submit" disabled={saving}>
              Guardar estado
            </button>
            <button
              className="admin-btn ghost"
              type="button"
              disabled={saving || !note.trim()}
              onClick={() => void addNoteOnly()}
            >
              Adicionar nota
            </button>
          </div>
        </form>

        {data.notes.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Ainda sem notas comerciais.
          </p>
        ) : (
          <ul className="notes-list">
            {data.notes.map((n) => (
              <li key={n.id} className="note-card">
                <div className="note-meta">
                  {new Date(n.created_at).toLocaleString("pt-MZ")} ·{" "}
                  {n.admin_email || "admin"}
                  {n.previous_commercial_status != null &&
                    n.new_commercial_status != null &&
                    n.previous_commercial_status !== n.new_commercial_status && (
                      <span>
                        {" "}
                        · {n.previous_commercial_status} → {n.new_commercial_status}
                      </span>
                    )}
                </div>
                <div className="note-body">{n.note}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Linha temporal</h2>
          <span className="muted" style={{ fontSize: "0.78rem" }}>
            {events.length} eventos
          </span>
        </div>
        <div className="filters" style={{ marginBottom: 14 }}>
          <div className="filter-field">
            <label htmlFor="tl-session">Sessão</label>
            <select
              id="tl-session"
              value={sessionFilter}
              onChange={(e) => {
                setSessionFilter(e.target.value);
                setTimelineShown(TIMELINE_PAGE);
              }}
            >
              <option value="">Todas as sessões</option>
              {data.sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {new Date(s.started_at).toLocaleString("pt-MZ")}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-field">
            <label htmlFor="tl-event">Tipo de evento</label>
            <select
              id="tl-event"
              value={eventFilter}
              onChange={(e) => {
                setEventFilter(e.target.value);
                setTimelineShown(TIMELINE_PAGE);
              }}
            >
              <option value="">Todos</option>
              {[...new Set(data.events.map((e) => e.event_name))].map((n) => (
                <option key={n} value={n}>
                  {labelEventName(n)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="empty">Sem eventos neste filtro.</div>
        ) : (
          <>
            {eventsByDay.map((group) => (
              <div key={group.day}>
                <div className="timeline-group">{group.day}</div>
                <ul className="timeline">
                  {group.items.map((ev) => {
                    const when = new Date(ev.occurred_at);
                    const open = expanded[ev.id];
                    const hasDetails = Boolean(
                      ev.element_name || ev.value || ev.action || ev.step_id
                    );
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
                            {describeEvent(ev)}
                          </div>
                          <div className="timeline-meta">
                            <span>{labelEventName(ev.event_name)}</span>
                            {ev.step_id && (
                              <span>{formatStepLabel(ev.step_id)}</span>
                            )}
                            {hasDetails && (
                              <button
                                type="button"
                                className="admin-btn ghost sm"
                                style={{ minHeight: 24, padding: "2px 8px" }}
                                onClick={() =>
                                  setExpanded((prev) => ({
                                    ...prev,
                                    [ev.id]: !prev[ev.id],
                                  }))
                                }
                              >
                                {open ? "Ocultar" : "Detalhes"}
                              </button>
                            )}
                          </div>
                          {open && (
                            <div
                              className="timeline-desc"
                              style={{ marginTop: 6, fontSize: "0.8rem" }}
                            >
                              {ev.step_id && (
                                <div>Etapa: {ev.step_id}</div>
                              )}
                              {ev.element_name && (
                                <div>Elemento: {ev.element_name}</div>
                              )}
                              {ev.action && <div>Acção: {ev.action}</div>}
                              {ev.value && <div>Valor: {ev.value}</div>}
                              <div>
                                Sessão: <code>{ev.session_id.slice(0, 8)}…</code>
                              </div>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {timelineShown < events.length && (
              <div style={{ marginTop: 12, textAlign: "center" }}>
                <button
                  type="button"
                  className="admin-btn ghost sm"
                  onClick={() => setTimelineShown((n) => n + TIMELINE_PAGE)}
                >
                  Mostrar mais ({events.length - timelineShown} restantes)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
