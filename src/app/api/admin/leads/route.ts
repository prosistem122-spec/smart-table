import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { authErrorResponse } from "@/lib/admin/errors";
import { createServiceClient } from "@/lib/supabase/server";
import { deriveNavigationStatus } from "@/lib/navigation-status";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const sp = req.nextUrl.searchParams;
    const q = (sp.get("q") || "").trim();
    const page = Math.max(1, Number(sp.get("page") || 1));
    const pageSize = Math.min(50, Math.max(5, Number(sp.get("pageSize") || 20)));
    const sort = sp.get("sort") || "last_activity_at";
    const order = sp.get("order") === "asc" ? true : false;
    const commercial = sp.get("commercial_status") || "";
    const source = sp.get("source") || "";
    const nav = sp.get("navigation_status") || "";

    const supabase = createServiceClient();
    let query = supabase.from("leads").select("*", { count: "exact" });

    if (q) {
      query = query.or(
        `restaurant_name.ilike.%${q}%,phone_normalized.ilike.%${q}%,phone_raw.ilike.%${q}%`
      );
    }
    if (commercial) query = query.eq("commercial_status", commercial);
    if (source) {
      query = query.or(`source.eq.${source},utm_source.eq.${source}`);
    }

    const allowedSort = new Set([
      "last_activity_at",
      "created_at",
      "restaurant_name",
      "sessions_count",
    ]);
    const sortCol = allowedSort.has(sort) ? sort : "last_activity_at";

    // Se filtramos por navegação, precisamos de mais linhas e filtrar em memória
    if (nav) {
      const { data, error } = await query.order(sortCol, { ascending: order }).limit(500);
      if (error) throw error;
      const filtered = (data || []).filter(
        (l) => deriveNavigationStatus(l) === nav
      );
      const start = (page - 1) * pageSize;
      const slice = filtered.slice(start, start + pageSize);
      return Response.json({
        items: slice.map((l) => ({
          ...l,
          navigation_status: deriveNavigationStatus(l),
        })),
        total: filtered.length,
        page,
        pageSize,
      });
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query
      .order(sortCol, { ascending: order })
      .range(from, to);

    if (error) throw error;

    return Response.json({
      items: (data || []).map((l) => ({
        ...l,
        navigation_status: deriveNavigationStatus(l),
      })),
      total: count || 0,
      page,
      pageSize,
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
