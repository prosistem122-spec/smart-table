import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { authErrorResponse } from "@/lib/admin/errors";
import { createServiceClient } from "@/lib/supabase/server";
import { videoSettingsUpdateSchema } from "@/lib/validation";
import {
  DEFAULT_VIDEO_SETTINGS,
  VIDEO_SLOTS,
  type FunnelVideoSettings,
  type VideoSlot,
} from "@/lib/video/settings";

export const runtime = "nodejs";

function resolveUrl(
  supabase: ReturnType<typeof createServiceClient>,
  path: string | null,
  fallback: string | null
): string | null {
  if (path) {
    const { data } = supabase.storage.from("funnel-videos").getPublicUrl(path);
    if (data.publicUrl) return data.publicUrl;
  }
  return fallback;
}

function mapRow(
  supabase: ReturnType<typeof createServiceClient>,
  row: {
    slot: string;
    video_path: string | null;
    video_url: string | null;
    cta_delay_seconds: number;
    timeline_curve: number;
    updated_at?: string;
  }
): FunnelVideoSettings {
  return {
    slot: row.slot as VideoSlot,
    video_path: row.video_path,
    video_url: resolveUrl(supabase, row.video_path, row.video_url),
    cta_delay_seconds: row.cta_delay_seconds,
    timeline_curve: Number(row.timeline_curve),
    updated_at: row.updated_at,
  };
}

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("funnel_video_settings")
      .select("*")
      .order("slot");

    if (error) throw error;

    const bySlot = new Map(
      (data || []).map((r) => [r.slot, mapRow(supabase, r)])
    );

    return Response.json({
      settings: VIDEO_SLOTS.map(
        (s) => bySlot.get(s) || DEFAULT_VIDEO_SETTINGS[s]
      ),
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const parsed = videoSettingsUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { slot, cta_delay_seconds, timeline_curve, video_url, clear_video } =
      parsed.data;

    const { data: existing } = await supabase
      .from("funnel_video_settings")
      .select("*")
      .eq("slot", slot)
      .maybeSingle();

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: admin.userId,
    };

    if (cta_delay_seconds !== undefined) {
      patch.cta_delay_seconds = cta_delay_seconds;
    }
    if (timeline_curve !== undefined) {
      patch.timeline_curve = timeline_curve;
    }

    if (clear_video) {
      if (existing?.video_path) {
        await supabase.storage
          .from("funnel-videos")
          .remove([existing.video_path]);
      }
      patch.video_path = null;
      patch.video_url = null;
    } else if (video_url !== undefined) {
      if (existing?.video_path) {
        await supabase.storage
          .from("funnel-videos")
          .remove([existing.video_path]);
      }
      patch.video_path = null;
      patch.video_url = video_url;
    }

    const { data, error } = await supabase
      .from("funnel_video_settings")
      .upsert(
        {
          slot,
          cta_delay_seconds:
            cta_delay_seconds ??
            existing?.cta_delay_seconds ??
            DEFAULT_VIDEO_SETTINGS[slot].cta_delay_seconds,
          timeline_curve:
            timeline_curve ??
            existing?.timeline_curve ??
            DEFAULT_VIDEO_SETTINGS[slot].timeline_curve,
          video_path:
            patch.video_path !== undefined
              ? patch.video_path
              : existing?.video_path ?? null,
          video_url:
            patch.video_url !== undefined
              ? patch.video_url
              : existing?.video_url ?? null,
          updated_at: patch.updated_at,
          updated_by: admin.userId,
        },
        { onConflict: "slot" }
      )
      .select("*")
      .single();

    if (error) throw error;

    return Response.json({ settings: mapRow(supabase, data) });
  } catch (err) {
    return authErrorResponse(err);
  }
}
