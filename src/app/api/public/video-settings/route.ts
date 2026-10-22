import { tryCreateServiceClient } from "@/lib/supabase/server";
import {
  DEFAULT_VIDEO_SETTINGS,
  VIDEO_SLOTS,
  type FunnelVideoSettings,
  type VideoSlot,
} from "@/lib/video/settings";

export const runtime = "nodejs";

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
    cta_delay_seconds: number;
    timeline_curve: number;
  }
): FunnelVideoSettings {
  const slot = row.slot as VideoSlot;
  const fromStorage = publicUrl(supabase, row.video_path);
  return {
    slot,
    video_path: row.video_path,
    video_url: fromStorage || row.video_url,
    cta_delay_seconds: row.cta_delay_seconds,
    timeline_curve: Number(row.timeline_curve),
  };
}

export async function GET() {
  const supabase = tryCreateServiceClient();
  if (!supabase) {
    return Response.json({
      settings: VIDEO_SLOTS.map((s) => DEFAULT_VIDEO_SETTINGS[s]),
    });
  }

  try {
    const { data, error } = await supabase
      .from("funnel_video_settings")
      .select("slot, video_path, video_url, cta_delay_seconds, timeline_curve");

    if (error) throw error;

    const bySlot = new Map(
      (data || []).map((r) => [r.slot, normalizeRow(supabase, r)])
    );

    return Response.json({
      settings: VIDEO_SLOTS.map(
        (s) => bySlot.get(s) || DEFAULT_VIDEO_SETTINGS[s]
      ),
    });
  } catch {
    return Response.json({
      settings: VIDEO_SLOTS.map((s) => DEFAULT_VIDEO_SETTINGS[s]),
    });
  }
}
