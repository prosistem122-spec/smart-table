export const VIDEO_SLOTS = ["hero_intro", "hero_social_proof"] as const;
export type VideoSlot = (typeof VIDEO_SLOTS)[number];

export const VIDEO_SLOT_LABELS: Record<VideoSlot, string> = {
  hero_intro: "Introdução (Quero a ferramenta)",
  hero_social_proof: "Prova social (Obter a Smart Table)",
};

export interface FunnelVideoSettings {
  slot: VideoSlot;
  video_path: string | null;
  video_url: string | null;
  cta_delay_seconds: number;
  timeline_curve: number;
  /** HTML do título acima do VSL; null/vazio = texto padrão do funil */
  headline_html: string | null;
  updated_at?: string;
}

export const DEFAULT_HEADLINES: Record<VideoSlot, string> = {
  hero_intro:
    "Veja como a <mark>inteligência artificial</mark> pode elevar o <mark>faturamento do teu restaurante</mark>",
  hero_social_proof:
    "Esta tecnologia já está a <mark>elevar o faturamento</mark> de vários restaurantes",
};

export const DEFAULT_VIDEO_SETTINGS: Record<VideoSlot, FunnelVideoSettings> = {
  hero_intro: {
    slot: "hero_intro",
    video_path: null,
    video_url: null,
    cta_delay_seconds: 45,
    timeline_curve: 2.2,
    headline_html: DEFAULT_HEADLINES.hero_intro,
  },
  hero_social_proof: {
    slot: "hero_social_proof",
    video_path: null,
    video_url: null,
    cta_delay_seconds: 30,
    timeline_curve: 2.2,
    headline_html: DEFAULT_HEADLINES.hero_social_proof,
  },
};

/** Progresso visual ease-out: começa rápido, abranda no fim. */
export function visualProgress(realProgress: number, curve: number): number {
  const t = Math.min(1, Math.max(0, realProgress));
  const c = Math.min(5, Math.max(1, curve));
  return 1 - Math.pow(1 - t, c);
}

export function isVideoSlot(v: string): v is VideoSlot {
  return (VIDEO_SLOTS as readonly string[]).includes(v);
}
