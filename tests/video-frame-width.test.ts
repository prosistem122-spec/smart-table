import { describe, expect, it } from "vitest";
import { videoSettingsUpdateSchema } from "../src/lib/validation";
import { DEFAULT_VIDEO_SETTINGS } from "../src/lib/video/settings";

describe("largura do enquadramento VSL", () => {
  it("mantém a largura original por defeito em ambos os vídeos", () => {
    expect(DEFAULT_VIDEO_SETTINGS.hero_intro.frame_width).toBe(280);
    expect(DEFAULT_VIDEO_SETTINGS.hero_social_proof.frame_width).toBe(280);
  });

  it("aceita apenas larguras inteiras dentro dos limites", () => {
    for (const frame_width of [160, 280, 500]) {
      expect(videoSettingsUpdateSchema.safeParse({ slot: "hero_intro", frame_width }).success).toBe(true);
    }
    for (const frame_width of [159, 501, 280.5, "280"]) {
      expect(videoSettingsUpdateSchema.safeParse({ slot: "hero_intro", frame_width }).success).toBe(false);
    }
  });
});
