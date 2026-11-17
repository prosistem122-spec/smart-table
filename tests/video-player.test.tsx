// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VslPlayer } from "@/components/funnel/VslPlayer";
import { visualProgress } from "@/lib/video/settings";

vi.mock("@/lib/tracking/client", () => ({ track: vi.fn() }));
vi.mock("@/lib/tracking/journey", () => ({ journeyMilestone: vi.fn() }));

const baseProps = {
  ctaDelaySeconds: 0,
  timelineCurve: 2.2,
  frameWidth: 280,
  settingsReady: true,
  stepId: "hero_intro",
  stepIndex: 0,
  ctaLabel: "Quero uma solução para o meu restaurante",
  ctaTrack: "cta_vsl_intro",
  onCta: vi.fn(),
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

afterEach(async () => {
  if (root) {
    await act(async () => root!.unmount());
    root = null;
  }
  container?.remove();
  container = null;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function mountPlayer(override: Partial<typeof baseProps> & { videoUrl: string | null; sourceMode: "auto" | "embed" }) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<VslPlayer {...baseProps} {...override} />);
  });
}

describe("player da VSL — estrutura e configuração do Admin", () => {
  it("usa o player do YouTube com barra de progresso e sem mostrar o botão antes de iniciar", () => {
    const html = renderToStaticMarkup(
      <VslPlayer
        {...baseProps}
        videoUrl="https://youtu.be/dQw4w9WgXcQ"
        sourceMode="auto"
      />
    );
    expect(html).toContain("youtube.com/embed/dQw4w9WgXcQ");
    expect(html).toContain("<iframe");
    expect(html).toContain("vsl-scrub");
    expect(html).toContain("width:280px");
    expect(html).not.toContain('aria-label="Reproduzir vídeo"');
    expect(html).not.toContain(baseProps.ctaLabel);
  });

  it("mantém o player, a barra de progresso e oculta o botão antes de iniciar em ficheiros directos", () => {
    const html = renderToStaticMarkup(
      <VslPlayer
        {...baseProps}
        videoUrl="https://example.com/file.mp4"
        sourceMode="auto"
      />
    );
    expect(html).toContain("<video");
    expect(html).toContain('aria-label="Reproduzir vídeo"');
    expect(html).toContain("vsl-scrub");
    expect(html).not.toContain(baseProps.ctaLabel);
  });

  it("utiliza iframe e oculta o botão antes do play para um URL genérico de incorporação", () => {
    const html = renderToStaticMarkup(
      <VslPlayer
        {...baseProps}
        videoUrl="https://example.com/player/123"
        sourceMode="embed"
      />
    );
    expect(html).toContain("<iframe");
    expect(html).not.toContain("<video");
    expect(html).not.toContain(baseProps.ctaLabel);
  });

  it("nunca mostra o botão antes do vídeo começar mesmo com a página aberta muito tempo e respeita o delay e a pausa", async () => {
    await mountPlayer({
      videoUrl: "https://example.com/vsl.mp4",
      sourceMode: "auto",
      ctaDelaySeconds: 10,
      timelineCurve: 3,
      frameWidth: 320,
    });

    const frame = container!.querySelector<HTMLDivElement>(".vsl")!;
    expect(frame.style.width).toBe("320px");

    // Página aberta durante 10 minutos sem iniciar o vídeo: botão nunca aparece.
    await act(async () => {
      vi.advanceTimersByTime(600_000);
    });
    expect(container!.querySelector('[data-track="cta_vsl_intro"]')).toBeNull();

    const video = container!.querySelector<HTMLVideoElement>("video")!;
    let currentTime = 0;
    Object.defineProperty(video, "duration", {
      configurable: true,
      get: () => 100,
    });
    Object.defineProperty(video, "currentTime", {
      configurable: true,
      get: () => currentTime,
    });

    // Inicia o vídeo e reproduz 6 segundos (< 10s).
    await act(async () => {
      video.dispatchEvent(new Event("play"));
      currentTime = 6;
      video.dispatchEvent(new Event("timeupdate"));
      vi.advanceTimersByTime(6_000);
    });
    expect(container!.querySelector('[data-track="cta_vsl_intro"]')).toBeNull();

    // Verifica que a barra de progresso segue exatamente a curva do Admin (3.0).
    const barFill = container!.querySelector<HTMLDivElement>(".vsl-scrub > div")!;
    const expectedPct = visualProgress(6 / 100, 3) * 100;
    expect(parseFloat(barFill.style.width)).toBeCloseTo(expectedPct, 1);

    // Pausa o vídeo durante 30 segundos: a contagem para e o botão continua oculto.
    await act(async () => {
      video.dispatchEvent(new Event("pause"));
      vi.advanceTimersByTime(30_000);
    });
    expect(container!.querySelector('[data-track="cta_vsl_intro"]')).toBeNull();

    // Retoma a reprodução por mais 4 segundos (total 10s reproduzidos): o botão aparece.
    await act(async () => {
      video.dispatchEvent(new Event("play"));
      currentTime = 10;
      video.dispatchEvent(new Event("timeupdate"));
      vi.advanceTimersByTime(4_000);
    });
    const cta = container!.querySelector<HTMLButtonElement>(
      '[data-track="cta_vsl_intro"]'
    );
    expect(cta).not.toBeNull();
    expect(cta!.textContent).toBe(baseProps.ctaLabel);
  });

  it("com delay 0s só mostra o botão depois de o vídeo ser iniciado", async () => {
    await mountPlayer({
      videoUrl: "https://example.com/vsl.mp4",
      sourceMode: "auto",
      ctaDelaySeconds: 0,
    });

    await act(async () => {
      vi.advanceTimersByTime(120_000);
    });
    expect(container!.querySelector('[data-track="cta_vsl_intro"]')).toBeNull();

    const video = container!.querySelector<HTMLVideoElement>("video")!;
    await act(async () => {
      video.dispatchEvent(new Event("play"));
      vi.advanceTimersByTime(50);
    });
    expect(
      container!.querySelector('[data-track="cta_vsl_intro"]')
    ).not.toBeNull();
  });

  it("em players externos (YouTube) inicia a contagem e a barra de progresso apenas após o play", async () => {
    await mountPlayer({
      videoUrl: "https://youtu.be/dQw4w9WgXcQ",
      sourceMode: "auto",
      ctaDelaySeconds: 15,
      timelineCurve: 2.5,
    });

    const iframe = container!.querySelector<HTMLIFrameElement>("iframe")!;

    // Antes do play, mesmo após 5 minutos, o botão não aparece e a barra está a 0%.
    await act(async () => {
      vi.advanceTimersByTime(300_000);
    });
    expect(container!.querySelector('[data-track="cta_vsl_intro"]')).toBeNull();
    const barFill = container!.querySelector<HTMLDivElement>(".vsl-scrub > div")!;
    expect(barFill.style.width).toBe("0%");

    // Simula evento de início de reprodução do YouTube (playerState = 1).
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          source: iframe.contentWindow,
          origin: "https://www.youtube.com",
          data: JSON.stringify({
            event: "infoDelivery",
            info: { playerState: 1, currentTime: 10, duration: 100 },
          }),
        })
      );
      vi.advanceTimersByTime(10_000);
    });
    expect(container!.querySelector('[data-track="cta_vsl_intro"]')).toBeNull();
    expect(parseFloat(barFill.style.width)).toBeCloseTo(
      visualProgress(0.1, 2.5) * 100,
      1
    );

    // Avança até atingir o delay configurado (15s).
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          source: iframe.contentWindow,
          origin: "https://www.youtube.com",
          data: JSON.stringify({
            event: "infoDelivery",
            info: { currentTime: 15, duration: 100 },
          }),
        })
      );
      vi.advanceTimersByTime(5_000);
    });
    expect(
      container!.querySelector('[data-track="cta_vsl_intro"]')
    ).not.toBeNull();
  });

  it("aguarda o carregamento das definições do Admin antes de permitir reproduzir ou libertar o botão", async () => {
    await mountPlayer({
      videoUrl: "https://example.com/vsl.mp4",
      sourceMode: "auto",
      ctaDelaySeconds: 0,
      settingsReady: false,
    });

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(container!.querySelector("video")).toBeNull();
    expect(container!.querySelector('[data-track="cta_vsl_intro"]')).toBeNull();

    // Chegam as definições do Admin com delay de 20s.
    await act(async () => {
      root!.render(
        <VslPlayer
          {...baseProps}
          videoUrl="https://example.com/vsl.mp4"
          sourceMode="auto"
          ctaDelaySeconds={20}
          settingsReady={true}
        />
      );
    });
    const video = container!.querySelector<HTMLVideoElement>("video")!;
    expect(video).not.toBeNull();
    expect(container!.querySelector('[data-track="cta_vsl_intro"]')).toBeNull();

    // Inicia o vídeo: aos 19s ainda oculto, aos 20s aparece.
    await act(async () => {
      video.dispatchEvent(new Event("play"));
      vi.advanceTimersByTime(19_000);
    });
    expect(container!.querySelector('[data-track="cta_vsl_intro"]')).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    expect(
      container!.querySelector('[data-track="cta_vsl_intro"]')
    ).not.toBeNull();
  });
});
