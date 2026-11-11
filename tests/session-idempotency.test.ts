import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ maybeSingle: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ tryCreateServiceClient: () => ({ from: mocks.from }) }));
vi.mock("@/lib/rate-limit", () => ({ clientIp: () => "test", rateLimit: () => ({ ok: true }) }));
vi.mock("@/lib/env", () => ({ getRateLimitPerMinute: () => 60, isSupabaseConfigured: () => true }));
import { POST } from "@/app/api/public/session/route";
const submission_id = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
function request() { return new NextRequest("http://localhost/api/public/session", { method: "POST", body: JSON.stringify({ restaurant_name: "Restaurante", phone: "+258841234567", submission_id, consent_analytics: true, consent_contact: true }), headers: { "content-type": "application/json" } }); }
beforeEach(() => {
  mocks.from.mockReset(); mocks.maybeSingle.mockReset();
  mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }) });
});
describe("repetição da sessão de contacto", () => {
  it("devolve a sessão anterior sem criar outra", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: submission_id, lead_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", leads: { phone_normalized: "+258841234567" } }, error: null });
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ session_id: submission_id, already_started: true });
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
  it("rejeita a mesma chave para outro telefone", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: submission_id, lead_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", leads: { phone_normalized: "+258851234567" } }, error: null });
    const res = await POST(request());
    expect(res.status).toBe(409);
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
});
