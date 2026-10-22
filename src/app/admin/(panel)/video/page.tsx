"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  DEFAULT_VIDEO_SETTINGS,
  VIDEO_SLOT_LABELS,
  VIDEO_SLOTS,
  visualProgress,
  type FunnelVideoSettings,
  type VideoSlot,
} from "@/lib/video/settings";

type SlotState = FunnelVideoSettings & {
  saving?: boolean;
  uploading?: boolean;
  message?: string | null;
  error?: string | null;
  urlDraft?: string;
};

export default function AdminVideoPage() {
  const [slots, setSlots] = useState<Record<VideoSlot, SlotState>>(() => ({
    hero_intro: { ...DEFAULT_VIDEO_SETTINGS.hero_intro, urlDraft: "" },
    hero_social_proof: {
      ...DEFAULT_VIDEO_SETTINGS.hero_social_proof,
      urlDraft: "",
    },
  }));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/video-settings");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Erro ${res.status}`);
      }
      const json = (await res.json()) as { settings: FunnelVideoSettings[] };
      setSlots((prev) => {
        const next = { ...prev };
        for (const s of json.settings) {
          next[s.slot] = {
            ...s,
            urlDraft: s.video_path ? "" : s.video_url || "",
            message: null,
            error: null,
          };
        }
        return next;
      });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function patchSlot(slot: VideoSlot, patch: Partial<SlotState>) {
    setSlots((prev) => ({ ...prev, [slot]: { ...prev[slot], ...patch } }));
  }

  async function saveSettings(slot: VideoSlot, e: FormEvent) {
    e.preventDefault();
    const s = slots[slot];
    patchSlot(slot, { saving: true, error: null, message: null });
    try {
      const body: Record<string, unknown> = {
        slot,
        cta_delay_seconds: s.cta_delay_seconds,
        timeline_curve: s.timeline_curve,
      };
      const draft = (s.urlDraft || "").trim();
      if (draft && !s.video_path) {
        body.video_url = draft;
      }
      const res = await fetch("/api/admin/video-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Falha ao guardar");
      const updated = j.settings as FunnelVideoSettings;
      patchSlot(slot, {
        ...updated,
        urlDraft: updated.video_path ? "" : updated.video_url || "",
        saving: false,
        message: "Definições guardadas.",
      });
    } catch (err) {
      patchSlot(slot, {
        saving: false,
        error: err instanceof Error ? err.message : "Erro",
      });
    }
  }

  async function uploadFile(slot: VideoSlot, file: File | null) {
    if (!file) return;
    patchSlot(slot, { uploading: true, error: null, message: null });
    try {
      const fd = new FormData();
      fd.set("slot", slot);
      fd.set("file", file);
      const res = await fetch("/api/admin/video-settings/upload", {
        method: "POST",
        body: fd,
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Falha no upload");
      const updated = j.settings as FunnelVideoSettings;
      patchSlot(slot, {
        ...updated,
        urlDraft: "",
        uploading: false,
        message: "Vídeo enviado com sucesso.",
      });
    } catch (err) {
      patchSlot(slot, {
        uploading: false,
        error: err instanceof Error ? err.message : "Erro no upload",
      });
    }
  }

  async function removeVideo(slot: VideoSlot) {
    if (!confirm("Remover o vídeo deste slot?")) return;
    patchSlot(slot, { saving: true, error: null, message: null });
    try {
      const res = await fetch("/api/admin/video-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, clear_video: true }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Falha ao remover");
      const updated = j.settings as FunnelVideoSettings;
      patchSlot(slot, {
        ...updated,
        urlDraft: "",
        saving: false,
        message: "Vídeo removido.",
      });
    } catch (err) {
      patchSlot(slot, {
        saving: false,
        error: err instanceof Error ? err.message : "Erro",
      });
    }
  }

  if (loading) return <div className="empty">A carregar vídeos…</div>;

  return (
    <>
      <h1 className="admin-title">Vídeos do funil</h1>
      <p className="admin-lead">
        Carrega o vídeo vertical de cada ecrã VSL, define quando aparece o botão
        CTA e ajusta a barra de progresso (rápida no início, lenta no fim). O
        cliente não consegue voltar atrás no vídeo.
      </p>

      {loadError && <div className="alert error">{loadError}</div>}

      <div className="video-slots">
        {VIDEO_SLOTS.map((slot) => {
          const s = slots[slot];
          const previewPts = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
            real: Math.round(t * 100),
            visual: Math.round(visualProgress(t, s.timeline_curve) * 100),
          }));

          return (
            <section className="panel video-slot-panel" key={slot}>
              <div className="panel-head">
                <h2 className="panel-title">{VIDEO_SLOT_LABELS[slot]}</h2>
                <code className="muted">{slot}</code>
              </div>

              {s.error && <div className="alert error">{s.error}</div>}
              {s.message && <div className="alert ok">{s.message}</div>}

              <div className="video-slot-grid">
                <div className="video-preview-col">
                  <div className="video-preview-frame">
                    {s.video_url ? (
                      <video
                        src={s.video_url}
                        controls
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <div className="video-preview-empty">Sem vídeo</div>
                    )}
                  </div>
                  <div className="filter-actions" style={{ marginTop: 10 }}>
                    <label className="admin-btn">
                      {s.uploading ? "A enviar…" : "Upload"}
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                        hidden
                        disabled={s.uploading}
                        onChange={(e) =>
                          void uploadFile(slot, e.target.files?.[0] || null)
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="admin-btn ghost"
                      disabled={s.saving || (!s.video_url && !s.video_path)}
                      onClick={() => void removeVideo(slot)}
                    >
                      Remover
                    </button>
                  </div>
                </div>

                <form
                  className="video-settings-form"
                  onSubmit={(e) => void saveSettings(slot, e)}
                >
                  <div className="filter-field">
                    <label htmlFor={`${slot}-url`}>
                      Ou cola um URL de vídeo (MP4/WebM)
                    </label>
                    <input
                      id={`${slot}-url`}
                      className="admin-input"
                      type="url"
                      placeholder="https://…"
                      value={s.urlDraft || ""}
                      disabled={!!s.video_path}
                      onChange={(e) =>
                        patchSlot(slot, { urlDraft: e.target.value })
                      }
                    />
                    {s.video_path && (
                      <p className="muted" style={{ margin: "6px 0 0", fontSize: "0.78rem" }}>
                        Está a usar um ficheiro enviado. Remove-o para usar URL.
                      </p>
                    )}
                  </div>

                  <div className="filter-field">
                    <label htmlFor={`${slot}-delay`}>
                      Segundos até aparecer o botão CTA:{" "}
                      <strong>{s.cta_delay_seconds}s</strong>
                    </label>
                    <input
                      id={`${slot}-delay`}
                      type="range"
                      min={0}
                      max={300}
                      step={5}
                      value={s.cta_delay_seconds}
                      onChange={(e) =>
                        patchSlot(slot, {
                          cta_delay_seconds: Number(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="filter-field">
                    <label htmlFor={`${slot}-curve`}>
                      Curva da timeline (rápido → lento):{" "}
                      <strong>{s.timeline_curve.toFixed(1)}</strong>
                    </label>
                    <input
                      id={`${slot}-curve`}
                      type="range"
                      min={1}
                      max={5}
                      step={0.1}
                      value={s.timeline_curve}
                      onChange={(e) =>
                        patchSlot(slot, {
                          timeline_curve: Number(e.target.value),
                        })
                      }
                    />
                    <p className="muted" style={{ margin: "6px 0 0", fontSize: "0.78rem" }}>
                      1.0 = linear · valores maiores fazem a barra avançar cedo e
                      abrandar no fim (vídeo parece mais curto).
                    </p>
                    <div className="curve-preview">
                      {previewPts.map((p) => (
                        <span key={p.real}>
                          {p.real}% real → <em>{p.visual}%</em> barra
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="filter-actions">
                    <button
                      className="admin-btn"
                      type="submit"
                      disabled={s.saving || s.uploading}
                    >
                      {s.saving ? "A guardar…" : "Guardar definições"}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
