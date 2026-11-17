import { tryCreateServiceClient } from "@/lib/supabase/server";
import {
  DEFAULT_HEADLINES,
  DEFAULT_VIDEO_SETTINGS,
  VIDEO_SLOTS,
  isVideoSlot,
  type FunnelVideoSettings,
  type VideoSlot,
} from "@/lib/video/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
};

function publicUrl(
  supabase: ReturnType<NonNullable<typeof tryCreateServiceClient>>,
  path: string | null
): string | null {
  if (!supabase || !path) return null;
  const { data } = supabase.storage.from("funnel-videos").getPublicUrl(path);
  return data.publicUrl || null;
}

function normalizeRow(
  supabase: ReturnType<NonNullable<typeof tryCreateServiceClient>>,
  row: {
    slot: string;
    video_path: string | null;
    video_url: string | null;
    video_source_mode?: "auto" | "embed";
    cta_delay_seconds: number;
    timeline_curve: number;
    frame_width?: number;
    headline_html?: string | null;
  }
): FunnelVideoSettings | null {
  if (!isVideoSlot(row.slot)) return null;
  const slot: VideoSlot = row.slot;
  const defaults = DEFAULT_VIDEO_SETTINGS[slot];
  const fromStorage = publicUrl(supabase, row.video_path);
  const rawDelay = Number(row.cta_delay_seconds);
  const rawCurve = Number(row.timeline_curve);
  const rawWidth = Number(row.frame_width);

  return {
    slot,
    video_path: row.video_path,
    video_url: fromStorage || row.video_url || null,
    video_source_mode: row.video_path
      ? "auto"
      : row.video_source_mode === "embed"
        ? "embed"
        : "auto",
    cta_delay_seconds: Number.isFinite(rawDelay)
      ? Math.max(0, rawDelay)
      : defaults.cta_delay_seconds,
    timeline_curve: Number.isFinite(rawCurve)
      ? Math.min(5, Math.max(1, rawCurve))
      : defaults.timeline_curve,
    frame_width: Number.isFinite(rawWidth)
      ? Math.min(500, Math.max(160, rawWidth))
      : defaults.frame_width,
    headline_html:
      row.headline_html?.trim() || DEFAULT_HEADLINES[slot] || null,
  };
}

export async function GET() {
  const supabase = tryCreateServiceClient();
  if (!supabase) {
    return Response.json(
      { settings: VIDEO_SLOTS.map((s) => DEFAULT_VIDEO_SETTINGS[s]) },
      { headers: NO_STORE_HEADERS }
    );
  }

  try {
    const { data, error } = await supabase
      .from("funnel_video_settings")
      .select("*");

    if (error) throw error;

    const bySlot = new Map<VideoSlot, FunnelVideoSettings>();
    for (const r of data || []) {
      const normalized = normalizeRow(supabase, r);
      if (normalized) bySlot.set(normalized.slot, normalized);
    }

    return Response.json(
      {
        settings: VIDEO_SLOTS.map(
          (s) => bySlot.get(s) || DEFAULT_VIDEO_SETTINGS[s]
        ),
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch {
    return Response.json(
      { settings: VIDEO_SLOTS.map((s) => DEFAULT_VIDEO_SETTINGS[s]) },
      { headers: NO_STORE_HEADERS }
    );
  }
}
