import { describe, expect, it } from "vitest";
import { resolveVideoSource } from "@/lib/video/source";
import { videoSettingsUpdateSchema } from "@/lib/validation";

const id = "dQw4w9WgXcQ";
describe("links de vídeo", () => {
  it.each([
    `https://www.youtube.com/watch?v=${id}&t=3`,
    `https://youtu.be/${id}?si=abc`,
    `https://m.youtube.com/shorts/${id}`,
    `https://www.youtube.com/live/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}`,
  ])("converte o link do YouTube %s", (url) => {
    expect(resolveVideoSource(url)).toEqual({ kind: "youtube", src: `https://www.youtube.com/embed/${id}?enablejsapi=1&playsinline=1&rel=0` });
  });
  it("converte vídeos Vimeo e mantém o hash privado", () => {
    expect(resolveVideoSource("https://vimeo.com/12345/abc123")).toEqual({ kind: "vimeo", src: "https://player.vimeo.com/video/12345?h=abc123" });
    expect(resolveVideoSource("https://player.vimeo.com/video/12345?h=abc123")).toEqual({ kind: "vimeo", src: "https://player.vimeo.com/video/12345?h=abc123" });
  });
  it("converte links do Google Drive para pré-visualização", () => {
    expect(resolveVideoSource("https://drive.google.com/file/d/abc_123/view?usp=sharing")).toEqual({ kind: "drive", src: "https://drive.google.com/file/d/abc_123/preview" });
  });
  it("aceita ficheiros directos e links de incorporação genéricos", () => {
    expect(resolveVideoSource("https://example.com/file.mp4?token=abc")?.kind).toBe("direct");
    expect(resolveVideoSource("https://example.com/player/123", "embed")?.kind).toBe("embed");
    expect(resolveVideoSource("https://youtube.com.example.org/watch?v=" + id)?.kind).toBe("direct");
  });
  it("rejeita esquemas perigosos e links inválidos de plataformas conhecidas", () => {
    for (const url of ["javascript:alert(1)", "file:///etc/passwd", "https://youtube.com/watch?v=bad", "https://vimeo.com/channels", "https://user:pass@example.com/video.mp4"]) {
      expect(resolveVideoSource(url)).toBeNull();
      expect(videoSettingsUpdateSchema.safeParse({ slot: "hero_intro", video_url: url }).success).toBe(false);
    }
    expect(videoSettingsUpdateSchema.safeParse({ slot: "hero_intro", video_url: `https://youtu.be/${id}`, video_source_mode: "auto" }).success).toBe(true);
    expect(videoSettingsUpdateSchema.safeParse({ slot: "hero_intro", video_source_mode: "invalid" }).success).toBe(false);
  });
});
