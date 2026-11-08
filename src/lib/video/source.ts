/** URLs de páginas e de incorporação são diferentes de URLs directos de ficheiros. */
export type VideoSourceMode = "auto" | "embed";
export type VideoSource = { kind: "direct" | "youtube" | "vimeo" | "drive" | "embed"; src: string };

export function resolveVideoSource(value: string | null | undefined, mode: VideoSourceMode = "auto"): VideoSource | null {
  if (!value) return null;
  let url: URL;
  try { url = new URL(value.trim()); } catch { return null; }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);
  const youtube = host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtube-nocookie.com" || host.endsWith(".youtube-nocookie.com");
  if (youtube) {
    let id: string | null = null;
    if (host === "youtu.be") id = parts[0] || null;
    else if (parts[0] === "watch") id = url.searchParams.get("v");
    else if (["embed", "shorts", "live", "v"].includes(parts[0])) id = parts[1] || null;
    if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) return null;
    return { kind: "youtube", src: `https://www.youtube.com/embed/${id}?enablejsapi=1&playsinline=1&rel=0` };
  }
  const vimeo = host === "vimeo.com" || host === "www.vimeo.com" || host === "player.vimeo.com";
  if (vimeo) {
    const index = parts.findIndex((p) => /^\d+$/.test(p));
    if (index < 0) return null;
    const hash = url.searchParams.get("h") || (parts[index + 1] && /^[a-zA-Z0-9]+$/.test(parts[index + 1]) ? parts[index + 1] : null);
    const params = new URLSearchParams();
    if (hash) params.set("h", hash);
    return { kind: "vimeo", src: `https://player.vimeo.com/video/${parts[index]}${params.size ? `?${params}` : ""}` };
  }
  if (host === "drive.google.com" && parts[0] === "file" && parts[1] === "d") {
    const id = parts[2];
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) return null;
    return { kind: "drive", src: `https://drive.google.com/file/d/${id}/preview` };
  }
  return { kind: mode === "embed" ? "embed" : "direct", src: url.href };
}
