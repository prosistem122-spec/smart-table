import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { VslPlayer } from "@/components/funnel/VslPlayer";

const props = { ctaDelaySeconds: 0, timelineCurve: 2.2, frameWidth: 280, stepId: "hero_intro", stepIndex: 0, ctaLabel: "Continuar", ctaTrack: "cta", onCta: vi.fn() };
describe("player da VSL", () => {
  it("usa o player do YouTube sem sobrepor os seus controlos", () => {
    const html = renderToStaticMarkup(<VslPlayer {...props} videoUrl="https://youtu.be/dQw4w9WgXcQ" sourceMode="auto" />);
    expect(html).toContain("youtube.com/embed/dQw4w9WgXcQ");
    expect(html).toContain("<iframe");
    expect(html).not.toContain('aria-label="Reproduzir vídeo"');
    expect(html).toContain("Continuar");
  });
  it("mantém o player e a barra de ficheiros directos", () => {
    const html = renderToStaticMarkup(<VslPlayer {...props} videoUrl="https://example.com/file.mp4" sourceMode="auto" />);
    expect(html).toContain("<video");
    expect(html).toContain('aria-label="Reproduzir vídeo"');
    expect(html).toContain("vsl-scrub");
  });
  it("utiliza iframe para um URL genérico de incorporação", () => {
    const html = renderToStaticMarkup(<VslPlayer {...props} videoUrl="https://example.com/player/123" sourceMode="embed" />);
    expect(html).toContain("<iframe");
    expect(html).not.toContain("<video");
  });
});
