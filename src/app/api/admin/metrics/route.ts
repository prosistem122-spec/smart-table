import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { authErrorResponse } from "@/lib/admin/errors";
import { createServiceClient } from "@/lib/supabase/server";
import { computeDashboardMetrics } from "@/lib/admin/metrics";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const sp = req.nextUrl.searchParams;
    const metrics = await computeDashboardMetrics(createServiceClient(), {
      from: sp.get("from") || undefined,
      to: sp.get("to") || undefined,
      commercial_status: sp.get("commercial_status") || undefined,
      navigation_status: sp.get("navigation_status") || undefined,
      step: sp.get("step") || undefined,
      source: sp.get("source") || undefined,
      campaign: sp.get("campaign") || undefined,
    });
    return Response.json(metrics);
  } catch (err) {
    return authErrorResponse(err);
  }
}
