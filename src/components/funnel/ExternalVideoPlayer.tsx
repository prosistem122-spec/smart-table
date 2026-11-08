"use client";

import { useEffect, useRef } from "react";
import type { VideoSource } from "@/lib/video/source";

/** Os players externos mantêm os seus próprios controlos. Só o YouTube fornece eventos aqui. */
export function ExternalVideoPlayer({ source, onPlay, onEnded, className, title }: {
  source: VideoSource;
  onPlay?: () => void;
  onEnded?: () => void;
  className?: string;
  title: string;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const callbacks = useRef({ onPlay, onEnded });
  useEffect(() => { callbacks.current = { onPlay, onEnded }; }, [onPlay, onEnded]);

  useEffect(() => {
    if (source.kind !== "youtube") return;
    let ready = false;
    const post = (message: object) => frame.current?.contentWindow?.postMessage(JSON.stringify(message), "https://www.youtube.com");
    const listen = () => {
      if (!ready) post({ event: "listening", id: "vsl-player", channel: "widget" });
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.youtube.com" || event.source !== frame.current?.contentWindow) return;
      let data: { event?: string; info?: unknown };
      try { data = typeof event.data === "string" ? JSON.parse(event.data) : event.data; } catch { return; }
      if (!data || typeof data !== "object") return;
      if (data.event === "onReady") {
        ready = true;
        post({ event: "command", func: "addEventListener", args: ["onStateChange"], id: "vsl-player", channel: "widget" });
      }
      if (data.event === "onStateChange") {
        if (data.info === 1) callbacks.current.onPlay?.();
        if (data.info === 0) callbacks.current.onEnded?.();
      }
    };
    window.addEventListener("message", onMessage);
    const interval = window.setInterval(listen, 1000);
    listen();
    return () => { window.clearInterval(interval); window.removeEventListener("message", onMessage); };
  }, [source.kind, source.src]);

  return <iframe ref={frame} className={className} src={source.src} title={title}
    allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen
    referrerPolicy="strict-origin-when-cross-origin" />;
}
