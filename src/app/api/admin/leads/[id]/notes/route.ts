import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { authErrorResponse } from "@/lib/admin/errors";
import { createServiceClient } from "@/lib/supabase/server";
import { noteCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = noteCreateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Nota inválida" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: lead } = await supabase
      .from("leads")
      .select("id, commercial_status")
      .eq("id", id)
      .maybeSingle();

    if (!lead) return Response.json({ error: "Não encontrado" }, { status: 404 });

    const { data, error } = await supabase
      .from("lead_notes")
      .insert({
        lead_id: id,
        admin_user_id: admin.userId,
        admin_email: admin.email,
        note: parsed.data.note,
        previous_commercial_status: lead.commercial_status,
        new_commercial_status: lead.commercial_status,
      })
      .select("*")
      .single();

    if (error) throw error;
    return Response.json({ note: data });
  } catch (err) {
    return authErrorResponse(err);
  }
}
