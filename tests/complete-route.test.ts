import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ tryCreateServiceClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/rate-limit", () => ({ clientIp: () => "test", rateLimit: () => ({ ok: true }) }));
import { POST } from "@/app/api/public/complete/route";

const submission_id = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const lead_id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const session_id = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const answers = Object.entries({ nome: "Teste", resp_nome: "Ana", whatsapp: "+258841234567", cargo: "Gestora", telefone: "+258841234567", email: "ana@example.com" }).map(([question_key, answer]) => ({ question_key, answer, step_id: "contact_final" }));
function request(body: unknown) { return new NextRequest("http://localhost/api/public/complete", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }); }
beforeEach(() => mocks.rpc.mockReset());

describe("confirmação de submissão", () => {
  it("envia a chave e respostas para a transacção e identifica repetição", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: false, error: null });
    const body = { submission_id, lead_id, session_id, answers };
    const first = await POST(request(body));
    const retry = await POST(request(body));
    expect(await first.json()).toEqual({ ok: true, already_completed: false });
    expect(await retry.json()).toEqual({ ok: true, already_completed: true });
    expect(mocks.rpc).toHaveBeenCalledWith("complete_funnel_submission", { p_submission_id: submission_id, p_lead_id: lead_id, p_session_id: session_id, p_answers: answers });
  });
  it("recusa dados incompletos ou repetidos sem guardar", async () => {
    const invalid = await POST(request({ submission_id, lead_id, session_id, answers: answers.slice(0, 1) }));
    const duplicate = await POST(request({ submission_id, lead_id, session_id, answers: [...answers, answers[0]] }));
    expect(invalid.status).toBe(400); expect(duplicate.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("não confirma quando a base de dados falha", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "500", message: "failure" } });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await POST(request({ submission_id, lead_id, session_id, answers }));
    expect(response.status).toBe(500);
    expect((await response.json()).ok).not.toBe(true);
    log.mockRestore();
  });
});
