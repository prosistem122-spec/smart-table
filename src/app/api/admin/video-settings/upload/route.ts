import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { authErrorResponse } from "@/lib/admin/errors";
import { createServiceClient } from "@/lib/supabase/server";
import { isVideoSlot, type VideoSlot } from "@/lib/video/settings";

export const runtime = "nodejs";

const ALLOWED = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
]);
const MAX_BYTES = 100 * 1024 * 1024;

function extFor(mime: string, filename: string): string {
  const fromName = filename.split(".").pop()?.toLowerCase();
  if (fromName && ["mp4", "webm", "mov", "m4v"].includes(fromName)) {
    return fromName;
  }
  if (mime === "video/webm") return "webm";
  if (mime === "video/quicktime") return "mov";
  if (mime === "video/x-m4v") return "m4v";
  return "mp4";
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const form = await req.formData();
    const slotRaw = String(form.get("slot") || "");
    const file = form.get("file");

    if (!isVideoSlot(slotRaw)) {
      return Response.json({ error: "Slot inválido" }, { status: 400 });
    }
    const slot: VideoSlot = slotRaw;

    if (!(file instanceof File)) {
      return Response.json({ error: "Ficheiro em falta" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return Response.json(
        { error: "Formato não suportado. Use MP4, WebM ou MOV." },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return Response.json(
        { error: "Ficheiro demasiado grande (máx. 100 MB)." },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const { data: existing } = await supabase
      .from("funnel_video_settings")
      .select("*")
      .eq("slot", slot)
      .maybeSingle();

    const ext = extFor(file.type, file.name);
    const path = `${slot}/${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await supabase.storage
      .from("funnel-videos")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (upErr) {
      return Response.json(
        { error: upErr.message || "Falha no upload" },
        { status: 500 }
      );
    }

    if (existing?.video_path) {
      await supabase.storage
        .from("funnel-videos")
        .remove([existing.video_path]);
    }

    const { data: pub } = supabase.storage
      .from("funnel-videos")
      .getPublicUrl(path);

    const { data, error } = await supabase
      .from("funnel_video_settings")
      .upsert(
        {
          slot,
          video_path: path,
          video_url: pub.publicUrl,
          cta_delay_seconds: existing?.cta_delay_seconds ?? 45,
          timeline_curve: existing?.timeline_curve ?? 2.2,
          updated_at: new Date().toISOString(),
          updated_by: admin.userId,
        },
        { onConflict: "slot" }
      )
      .select("*")
      .single();

    if (error) throw error;

    return Response.json({
      settings: {
        slot: data.slot,
        video_path: data.video_path,
        video_url: pub.publicUrl,
        cta_delay_seconds: data.cta_delay_seconds,
        timeline_curve: Number(data.timeline_curve),
        updated_at: data.updated_at,
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
