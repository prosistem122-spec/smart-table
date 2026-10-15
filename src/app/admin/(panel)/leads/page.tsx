"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  COMMERCIAL_STATUS_LABELS,
  NAVIGATION_STATUS_LABELS,
  type CommercialStatus,
  type NavigationStatus,
} from "@/types";
import { formatPhoneDisplay } from "@/lib/phone";

interface LeadItem {
  id: string;
  restaurant_name: string;
  phone_normalized: string;
  created_at: string;
  last_activity_at: string;
  last_step: string | null;
  sessions_count: number;
  commercial_status: CommercialStatus;
  navigation_status: NavigationStatus;
  source: string | null;
  utm_source: string | null;
}

export default function AdminLeadsPage() {
  const router = useRouter();
  const [items, setItems] = useState<LeadItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [commercial, setCommercial] = useState("");
  const [nav, setNav] = useState("");
  const [source, setSource] = useState("");
  const [sort, setSort] = useState("last_activity_at");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const sp = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      sort,
      order: "desc",
    });
    if (q) sp.set("q", q);
    if (commercial) sp.set("commercial_status", commercial);
    if (nav) sp.set("navigation_status", nav);
    if (source) sp.set("source", source);
    try {
      const res = await fetch(`/api/admin/leads?${sp}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Erro ${res.status}`);
      }
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, q, commercial, nav, source, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <h1 className="admin-title">Potenciais clientes</h1>
      <p className="admin-sub">
        Pesquisa, filtros e acompanhamento comercial (distinto do estado de
        navegação).
      </p>

      <div className="filters">
        <input
          placeholder="Pesquisar nome ou telefone"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
        />
        <select
          value={commercial}
          onChange={(e) => {
            setPage(1);
            setCommercial(e.target.value);
          }}
        >
          <option value="">Estado comercial</option>
          {Object.entries(COMMERCIAL_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={nav}
          onChange={(e) => {
            setPage(1);
            setNav(e.target.value);
          }}
        >
          <option value="">Estado navegação</option>
          {Object.entries(NAVIGATION_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input
          placeholder="Origem"
          value={source}
          onChange={(e) => {
            setPage(1);
            setSource(e.target.value);
          }}
        />
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="last_activity_at">Última atividade</option>
          <option value="created_at">Data de entrada</option>
          <option value="restaurant_name">Nome</option>
          <option value="sessions_count">Sessões</option>
        </select>
        <button type="button" className="admin-btn" onClick={() => void load()}>
          Atualizar
        </button>
      </div>

      {error && <div className="panel" style={{ color: "#C2492E" }}>{error}</div>}

      <div className="panel table-wrap">
        {loading ? (
          <div className="empty">A carregar…</div>
        ) : items.length === 0 ? (
          <div className="empty">Nenhum potencial cliente encontrado (0).</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Restaurante</th>
                <th>Telefone</th>
                <th>Entrada</th>
                <th>Última atividade</th>
                <th>Última etapa</th>
                <th>Sessões</th>
                <th>Navegação</th>
                <th>Origem</th>
                <th>Comercial</th>
              </tr>
            </thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id} onClick={() => router.push(`/admin/leads/${l.id}`)}>
                  <td>{l.restaurant_name}</td>
                  <td>{formatPhoneDisplay(l.phone_normalized)}</td>
                  <td>{new Date(l.created_at).toLocaleDateString("pt-MZ")}</td>
                  <td>
                    {new Date(l.last_activity_at).toLocaleString("pt-MZ")}
                  </td>
                  <td>{l.last_step || "—"}</td>
                  <td>{l.sessions_count}</td>
                  <td>
                    <span className="badge">
                      {NAVIGATION_STATUS_LABELS[l.navigation_status] ||
                        l.navigation_status}
                    </span>
                  </td>
                  <td>{l.utm_source || l.source || "direto"}</td>
                  <td>
                    <span className="badge ok">
                      {COMMERCIAL_STATUS_LABELS[l.commercial_status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="filters">
        <button
          type="button"
          className="admin-btn ghost"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Anterior
        </button>
        <span className="muted">
          Página {page} de {pages} · {total} registos
        </span>
        <button
          type="button"
          className="admin-btn ghost"
          disabled={page >= pages}
          onClick={() => setPage((p) => p + 1)}
        >
          Seguinte
        </button>
      </div>
    </>
  );
}
