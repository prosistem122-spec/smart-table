import { describe, expect, it } from "vitest";
import { runInNewContext } from "node:vm";
import { META_PIXEL_BASE } from "@/lib/tracking/meta-pixel-base";

function runPixel(pathname: string) {
  const inserted: unknown[] = [];
  const script = { parentNode: { insertBefore: (tag: unknown) => inserted.push(tag) } };
  const context: Record<string, unknown> = { location: { pathname }, document: { createElement: () => ({}), getElementsByTagName: () => [script] } };
  context.window = context;
  runInNewContext(META_PIXEL_BASE, context);
  return { context, inserted };
}
describe("Meta Pixel base", () => {
  it("inicializa e conta um PageView na página inicial e na análise", () => {
    for (const path of ["/", "/analise"]) {
      const { context, inserted } = runPixel(path);
      const fbq = context.fbq as { queue: unknown[][] };
      expect(inserted).toHaveLength(1);
      expect(Array.from(fbq.queue[0])).toEqual(["init", "1115803051092289"]);
      expect(Array.from(fbq.queue[1])).toEqual(["track", "PageView"]);
      runInNewContext(META_PIXEL_BASE, context);
      expect(inserted).toHaveLength(1);
      expect(fbq.queue).toHaveLength(2);
    }
  });
  it("não envia PageView de admin pelo script de JavaScript", () => {
    const { context } = runPixel("/admin");
    expect((context.fbq as { queue: unknown[][] }).queue).toHaveLength(1);
  });
});
