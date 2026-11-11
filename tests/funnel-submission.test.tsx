// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { FunnelApp } from "@/components/funnel/FunnelApp";

const mocks = vi.hoisted(() => ({ complete: vi.fn(), start: vi.fn(), save: vi.fn(), track: vi.fn() }));
vi.mock("@/lib/tracking/client", () => ({
  track: mocks.track, saveAnswers: vi.fn(), saveAnswersConfirmed: mocks.save,
  startSession: mocks.start, completeSubmission: mocks.complete,
  getTrackingContext: () => ({ leadId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", sessionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", phoneNormalized: "+258841234567" }),
}));
vi.mock("@/lib/tracking/journey", () => ({
  clearJourneyConsent: vi.fn(), enableJourneyCapture: vi.fn(), hasJourneyConsent: () => true,
  journeyAnswer: vi.fn(), journeyMilestone: vi.fn(), journeyStep: vi.fn(), journeyStepSeen: vi.fn(),
}));

const partial = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const final = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const draft = { resp_nome: "Ana", whatsapp: "+258841234567", cargo: "Gestora", telefone: "+258841234567", email: "ana@example.com", contactoEmpresa: "" };
let root: Root;
let node: HTMLDivElement;

async function mount() {
  node = document.createElement("div"); document.body.appendChild(node);
  root = createRoot(node);
  await act(async () => { root.render(<FunnelApp whatsappNumber="258841234567" />); });
}
function submit() { node.querySelector<HTMLButtonElement>('[data-track="cta_final_contact"]')!.click(); }

beforeEach(() => {
  vi.resetAllMocks(); sessionStorage.clear();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  window.fbq = vi.fn();
  vi.spyOn(window, "open").mockImplementation(() => null);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ settings: [] }) }));
  sessionStorage.setItem("st_funnel_progress_v1", JSON.stringify({ version: 1, cur: 18, ans: { nome: "Restaurante Teste", ...draft }, quizSel: {}, contactDraft: draft, inputValue: "", contactExpanded: false, calcPct: 15, journeyConsent: true, captureEnabled: true, partialSubmissionId: partial, partialPhone: "+258841234567", finalSubmissionId: final, completed: false }));
});
afterEach(async () => { if (root) await act(async () => root.unmount()); node?.remove(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("submissão final do funil", () => {
  it("bloqueia duplo clique e só regista Lead após confirmação; refresh mantém sucesso", async () => {
    let resolve!: (value: { alreadyCompleted: boolean }) => void;
    mocks.complete.mockReturnValue(new Promise((r) => { resolve = r; }));
    await mount();
    await act(async () => { submit(); submit(); });
    expect(mocks.complete).toHaveBeenCalledTimes(1);
    expect(window.fbq).not.toHaveBeenCalled();
    expect(node.querySelector<HTMLButtonElement>('[data-track="cta_final_contact"]')?.disabled).toBe(true);
    await act(async () => { resolve({ alreadyCompleted: false }); });
    expect(window.fbq).toHaveBeenCalledTimes(1);
    expect(window.fbq).toHaveBeenCalledWith("track", "Lead", {}, { eventID: final });
    expect(JSON.parse(sessionStorage.getItem("st_funnel_progress_v1")!).completed).toBe(true);
    await act(async () => root.unmount()); node.remove();
    await mount();
    expect(node.querySelector('[data-track="cta_final_contact"]')).toBeNull();
    expect(mocks.complete).toHaveBeenCalledTimes(1);
    expect(window.fbq).toHaveBeenCalledTimes(1);
  });
  it("mostra erro e permite tentar novamente sem emitir Lead", async () => {
    mocks.complete.mockRejectedValueOnce(new Error("Falha ao guardar"));
    await mount();
    await act(async () => { submit(); });
    expect(node.textContent).toContain("Falha ao guardar");
    expect(node.querySelector<HTMLButtonElement>('[data-track="cta_final_contact"]')?.disabled).toBe(false);
    expect(window.fbq).not.toHaveBeenCalled();
  });
  it("não repete Lead quando o servidor já confirmou a chave", async () => {
    mocks.complete.mockResolvedValue({ alreadyCompleted: true });
    await mount();
    await act(async () => { submit(); });
    expect(window.fbq).not.toHaveBeenCalled();
    expect(JSON.parse(sessionStorage.getItem("st_funnel_progress_v1")!).completed).toBe(true);
  });
});

describe("progresso do funil", () => {
  it("preserva texto por preencher, etapa e dados ao actualizar e ao voltar", async () => {
    const progress = JSON.parse(sessionStorage.getItem("st_funnel_progress_v1")!);
    Object.assign(progress, { cur: 2, ans: {}, inputValue: "", completed: false, captureEnabled: false });
    sessionStorage.setItem("st_funnel_progress_v1", JSON.stringify(progress));
    await mount();
    const input = node.querySelector<HTMLInputElement>('input[placeholder="Ex: Sabores da Baixa"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "Restaurante novo");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(JSON.parse(sessionStorage.getItem("st_funnel_progress_v1")!).inputValue).toBe("Restaurante novo");
    await act(async () => root.unmount()); node.remove();
    await mount();
    expect(node.querySelector<HTMLInputElement>('input[placeholder="Ex: Sabores da Baixa"]')?.value).toBe("Restaurante novo");
    await act(async () => { node.querySelector<HTMLButtonElement>('[data-track="btn_step_continue"]')!.click(); });
    expect(JSON.parse(sessionStorage.getItem("st_funnel_progress_v1")!).cur).toBe(3);
    await act(async () => { node.querySelector<HTMLButtonElement>('[data-track="btn_step_back"]')!.click(); });
    expect(node.querySelector<HTMLInputElement>('input[placeholder="Ex: Sabores da Baixa"]')?.value).toBe("Restaurante novo");
  });
});
