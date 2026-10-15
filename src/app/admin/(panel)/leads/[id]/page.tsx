"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  COMMERCIAL_STATUS_LABELS,
  NAVIGATION_STATUS_LABELS,
  type CommercialStatus,
  type NavigationStatus,
} from "@/types";
import { formatPhoneDisplay } from "@/lib/phone";

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

function describeEvent(ev: ProfileData["events"][0]): string {
  const map: Record<string, string> = {
    landing_view: "Visitou a página inicial",
    lead_form_view: "Viu o formulário de identificação",
    lead_form_submitted: "Preencheu o nome e telefone do restaurante",
    funnel_started: "Iniciou o funil",
    step_view: `Visualizou a etapa ${ev.step_id || ""}`,
    step_completed: `Concluiu a etapa ${ev.step_id || ""}`,
    button_click: `Clicou em ${ev.element_name || "botão"}`,
    answer_selected: `Selecionou: ${ev.value || "—"}`,
    step_back: "Regressou à etapa anterior",
    section_view: `Viu a secção ${ev.element_name || ""}`,
    calculator_used: "Utilizou a simulação de faturação",
    result_viewed: "Visualizou os resultados",
    cta_clicked: `Clicou no CTA ${ev.element_name || ""}`,
    whatsapp_click: "Clicou para abrir o WhatsApp",
    contact_requested: "Pediu contacto",
    funnel_completed: "Concluiu o funil",
    session_resumed: "Retomou uma sessão reconhecida",
    session_inactive: "Sessão marcada como inativa",
  };
  return map[ev.event_name] || ev.event_name;
}

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

  async function saveStatus(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commercial_status: status, note: note || undefined }),
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

  async function addNote(e: FormEvent) {
    e.preventDefault();
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
      <div className="panel" style={{ color: "#C2492E" }}>
        {error} · <Link href="/admin/leads">Voltar</Link>
      </div>
    );
  }
  if (!data) return null;

  const { lead, behavioral } = data;

  return (
    <>
      <p>
        <Link href="/admin/leads">← Lista</Link>
      </p>
      <h1 className="admin-title">{lead.restaurant_name}</h1>
      <p className="admin-sub">
        Perfil individual ·{" "}
        {NAVIGATION_STATUS_LABELS[lead.navigation_status] || lead.navigation_status}
      </p>
      {error && <div className="panel" style={{ color: "#C2492E" }}>{error}</div>}

      <div className="panel">
        <h2>Identificação</h2>
        <p>
          <strong>Telefone:</strong> {formatPhoneDisplay(lead.phone_normalized)} (
          {lead.phone_raw})
        </p>
        <p>
          <strong>ID interno:</strong> <code>{lead.id}</code>
        </p>
        <p>
          <strong>Criado:</strong>{" "}
          {new Date(lead.created_at).toLocaleString("pt-MZ")}
        </p>
        <p>
          <strong>Origem:</strong>{" "}
          {lead.utm_source || lead.source || "direto"}
          {lead.utm_campaign ? ` · ${lead.utm_campaign}` : ""}
        </p>
      </div>

      <div className="panel">
        <h2>Resumo comportamental</h2>
        <div className="kpi-grid">
          <div className="kpi">
            <div className="label">Sessões</div>
            <div className="value">{behavioral.sessions_count}</div>
          </div>
          <div className="kpi">
            <div className="label">Eventos</div>
            <div className="value">{behavioral.events_count}</div>
          </div>
          <div className="kpi">
            <div className="label">Interação aprox.</div>
            <div className="value">
              {Math.round(behavioral.approx_interaction_ms / 1000)}s
            </div>
          </div>
        </div>
        <p>
          Última atividade:{" "}
          {new Date(behavioral.last_activity_at).toLocaleString("pt-MZ")}
        </p>
        <p>
          Última página: {behavioral.last_page || "—"} · Última etapa:{" "}
          {behavioral.last_step || "—"}
        </p>
        <p>
          Último botão: {behavioral.last_button || "—"} · Última resposta:{" "}
          {behavioral.last_answer || "—"}
        </p>
        <p>
          Funil concluído: {behavioral.funnel_completed ? "sim" : "não"} ·
          WhatsApp: {behavioral.whatsapp_clicked ? "sim" : "não"} · Contacto:{" "}
          {behavioral.contact_requested ? "sim" : "não"}
        </p>
        <p className="muted">{behavioral.inactivity_rule}</p>
        <p>
          <strong>Etapas concluídas:</strong>{" "}
          {behavioral.completed_steps.join(", ") || "nenhuma"}
        </p>
        <p>
          <strong>Ainda não concluídas:</strong>{" "}
          {behavioral.pending_steps.slice(0, 8).join(", ")}
          {behavioral.pending_steps.length > 8 ? "…" : ""}
        </p>
      </div>

      <div className="panel">
        <h2>Acompanhamento comercial</h2>
        <form onSubmit={saveStatus} className="filters">
          <select
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
          <input
            className="admin-input"
            style={{ minWidth: 220 }}
            placeholder="Nota da alteração (opcional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button className="admin-btn" type="submit" disabled={saving}>
            Guardar estado
          </button>
        </form>
        <form onSubmit={addNote} className="filters">
          <button className="admin-btn ghost" type="submit" disabled={saving || !note.trim()}>
            Adicionar só nota
          </button>
        </form>
        <ul className="timeline">
          {data.notes.map((n) => (
            <li key={n.id}>
              <div className="time">
                {new Date(n.created_at).toLocaleString("pt-MZ")} ·{" "}
                {n.admin_email || "admin"}
              </div>
              <div className="desc">
                {n.note}
                {n.previous_commercial_status !== n.new_commercial_status && (
                  <span className="muted">
                    {" "}
                    ({n.previous_commercial_status} → {n.new_commercial_status})
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="panel">
        <h2>Linha temporal</h2>
        <div className="filters">
          <select
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
          >
            <option value="">Todas as sessões</option>
            {data.sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {new Date(s.started_at).toLocaleString("pt-MZ")}
              </option>
            ))}
          </select>
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
          >
            <option value="">Todos os eventos</option>
            {[...new Set(data.events.map((e) => e.event_name))].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        {events.length === 0 ? (
          <div className="empty">Sem eventos neste filtro.</div>
        ) : (
          <ul className="timeline">
            {events.map((ev) => (
              <li key={ev.id}>
                <div className="time">
                  {new Date(ev.occurred_at).toLocaleTimeString("pt-MZ", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · {ev.event_name}
                </div>
                <div className="desc">{describeEvent(ev)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
