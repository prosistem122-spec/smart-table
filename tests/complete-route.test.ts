import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  tryCreateServiceClient: () => ({ rpc: mocks.rpc, from: mocks.from }),
}));
vi.mock("@/lib/rate-limit", () => ({
  clientIp: () => "test",
  rateLimit: () => ({ ok: true }),
}));
import { POST } from "@/app/api/public/complete/route";

const submission_id = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const lead_id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const session_id = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const answers = Object.entries({
  nome: "Teste",
  resp_nome: "Ana",
  whatsapp: "+258841234567",
  cargo: "Gestora",
  telefone: "+258841234567",
  email: "ana@example.com",
}).map(([question_key, answer]) => ({
  question_key,
  answer,
  step_id: "contact_final",
}));

function request(body: unknown) {
  return new NextRequest("http://localhost/api/public/complete", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  mocks.rpc.mockReset();
  mocks.from.mockReset();
});

describe("confirmação de submissão", () => {
  it("envia a chave e respostas para a transacção e identifica repetição", async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: false, error: null });
    const body = { submission_id, lead_id, session_id, answers };
    const first = await POST(request(body));
    const retry = await POST(request(body));
    expect(await first.json()).toEqual({ ok: true, already_completed: false });
    expect(await retry.json()).toEqual({ ok: true, already_completed: true });
    expect(mocks.rpc).toHaveBeenCalledWith("complete_funnel_submission", {
      p_submission_id: submission_id,
      p_lead_id: lead_id,
      p_session_id: session_id,
      p_answers: answers,
    });
  });

  it("aceita respostas parciais ou vazias (campos opcionais)", async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: true, error: null });
    const partial = await POST(
      request({ submission_id, lead_id, session_id, answers: answers.slice(0, 1) })
    );
    const empty = await POST(
      request({ submission_id, lead_id, session_id, answers: [] })
    );
    expect(partial.status).toBe(200);
    expect(empty.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });

  it("recusa chaves duplicadas sem guardar", async () => {
    const duplicate = await POST(
      request({
        submission_id,
        lead_id,
        session_id,
        answers: [...answers, answers[0]],
      })
    );
    expect(duplicate.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("faz fallback directo às tabelas se a função RPC não existir", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST202", message: "Could not find the function" },
    });

    const upsert = vi.fn().mockResolvedValue({ error: null });
    const leadUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const sessionUpdateEq2 = vi.fn().mockResolvedValue({ error: null });
    const sessionUpdateEq1 = vi
      .fn()
      .mockReturnValue({ eq: sessionUpdateEq2 });

    mocks.from.mockImplementation((table: string) => {
      if (table === "sessions") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: session_id, lead_id },
                error: null,
              }),
            }),
          }),
          update: () => ({ eq: sessionUpdateEq1 }),
        };
      }
      if (table === "leads") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { funnel_completed: false },
                error: null,
              }),
            }),
          }),
          update: () => ({ eq: leadUpdateEq }),
        };
      }
      if (table === "funnel_answers") {
        return { upsert };
      }
      throw new Error(`Tabela inesperada: ${table}`);
    });

    const res = await POST(
      request({
        submission_id,
        lead_id,
        session_id,
        answers: [{ question_key: "nome", answer: "Maré", step_id: "restaurant_name" }],
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, already_completed: false });
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(leadUpdateEq).toHaveBeenCalledWith("id", lead_id);
  });

  it("não confirma quando a base de dados falha", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: "500", message: "failure" },
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await POST(
      request({ submission_id, lead_id, session_id, answers })
    );
    expect(response.status).toBe(500);
    expect((await response.json()).ok).not.toBe(true);
    log.mockRestore();
  });
});
