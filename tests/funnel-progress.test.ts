import { afterEach, describe, expect, it, vi } from "vitest";
import { readFunnelProgress, writeFunnelProgress, type FunnelProgress } from "@/lib/funnel-progress";
const progress: FunnelProgress = { version: 1, cur: 3, ans: { nome: "Teste" }, quizSel: {}, contactDraft: { resp_nome: "Ana" }, inputValue: "em curso", contactExpanded: false, calcPct: 15, journeyConsent: true, captureEnabled: true, partialSubmissionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", partialPhone: null, finalSubmissionId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", completed: false };
afterEach(() => vi.unstubAllGlobals());
describe("armazenamento de progresso", () => {
  it("guarda e recupera a etapa, rascunhos e identificadores", () => {
    let saved = "";
    vi.stubGlobal("sessionStorage", { getItem: () => saved, setItem: (_: string, value: string) => { saved = value; } });
    expect(writeFunnelProgress(progress)).toBe(true);
    expect(readFunnelProgress()).toEqual(progress);
  });
  it("ignora dados corrompidos ou etapas inválidas", () => {
    vi.stubGlobal("sessionStorage", { getItem: () => JSON.stringify({ ...progress, cur: 999 }) });
    expect(readFunnelProgress()).toBeNull();
  });
  it("comunica falhas de armazenamento", () => {
    vi.stubGlobal("sessionStorage", { setItem: () => { throw new Error("blocked"); } });
    expect(writeFunnelProgress(progress)).toBe(false);
  });
});
