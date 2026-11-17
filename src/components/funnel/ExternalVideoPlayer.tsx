"use client";

import { useEffect, useRef } from "react";
import type { VideoSource } from "@/lib/video/source";

interface Props {
  source: VideoSource;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  className?: string;
  title: string;
}

const YOUTUBE_ORIGINS = new Set([
  "https://www.youtube.com",
  "https://www.youtube-nocookie.com",
]);

const VIMEO_ORIGINS = new Set(["https://player.vimeo.com"]);

function parseMessageData(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return null;
}

/** Integração com players externos (YouTube, Vimeo, Player.js, Google Drive e embeds). */
export function ExternalVideoPlayer({
  source,
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  className,
  title,
}: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const loadHandlerRef = useRef<(() => void) | null>(null);
  const callbacks = useRef({ onPlay, onPause, onEnded, onTimeUpdate });

  useEffect(() => {
    callbacks.current = { onPlay, onPause, onEnded, onTimeUpdate };
  }, [onPlay, onPause, onEnded, onTimeUpdate]);

  useEffect(() => {
    let duration = 0;
    let lastState: number | null = null;

    if (source.kind === "youtube") {
      let subscribed = false;
      const post = (message: object) => {
        frame.current?.contentWindow?.postMessage(
          JSON.stringify(message),
          "https://www.youtube.com"
        );
      };
      const subscribe = () => {
        post({ event: "listening", id: "vsl-player", channel: "widget" });
        post({
          event: "command",
          func: "addEventListener",
          args: ["onStateChange"],
          id: "vsl-player",
          channel: "widget",
        });
      };
      const listen = () => {
        if (!subscribed) {
          post({ event: "listening", id: "vsl-player", channel: "widget" });
        }
      };
      loadHandlerRef.current = subscribe;

      const applyState = (state: number) => {
        if (state === lastState) return;
        lastState = state;
        if (state === 1) callbacks.current.onPlay?.();
        else if (state === 2 || state === 3) callbacks.current.onPause?.();
        else if (state === 0) callbacks.current.onEnded?.();
      };

      const onMessage = (event: MessageEvent) => {
        if (
          !YOUTUBE_ORIGINS.has(event.origin) ||
          event.source !== frame.current?.contentWindow
        ) {
          return;
        }
        const data = parseMessageData(event.data);
        if (!data) return;

        if (data.event === "onReady" || data.event === "initialDelivery") {
          if (!subscribed) {
            subscribed = true;
            post({
              event: "command",
              func: "addEventListener",
              args: ["onStateChange"],
              id: "vsl-player",
              channel: "widget",
            });
          }
        }

        if (data.event === "onStateChange" && typeof data.info === "number") {
          applyState(data.info);
        }

        if (
          (data.event === "infoDelivery" || data.event === "initialDelivery") &&
          data.info &&
          typeof data.info === "object"
        ) {
          const info = data.info as Record<string, unknown>;
          if (
            typeof info.duration === "number" &&
            Number.isFinite(info.duration) &&
            info.duration > 0
          ) {
            duration = info.duration;
          }
          if (typeof info.playerState === "number") {
            applyState(info.playerState);
          }
          if (
            lastState === 1 &&
            typeof info.currentTime === "number" &&
            Number.isFinite(info.currentTime) &&
            info.currentTime >= 0
          ) {
            callbacks.current.onTimeUpdate?.(info.currentTime, duration);
          }
        }
      };

      window.addEventListener("message", onMessage);
      const interval = window.setInterval(listen, 500);
      listen();
      return () => {
        loadHandlerRef.current = null;
        window.clearInterval(interval);
        window.removeEventListener("message", onMessage);
      };
    }

    if (source.kind === "vimeo") {
      let subscribed = false;
      const post = (message: object) => {
        frame.current?.contentWindow?.postMessage(
          JSON.stringify(message),
          "https://player.vimeo.com"
        );
      };
      const subscribe = () => {
        for (const ev of [
          "play",
          "playing",
          "pause",
          "ended",
          "finish",
          "timeupdate",
          "playProgress",
        ]) {
          post({ method: "addEventListener", value: ev });
        }
        post({ method: "getDuration" });
      };
      loadHandlerRef.current = subscribe;

      const onMessage = (event: MessageEvent) => {
        if (
          !VIMEO_ORIGINS.has(event.origin) ||
          event.source !== frame.current?.contentWindow
        ) {
          return;
        }
        const data = parseMessageData(event.data);
        if (!data) return;

        const ev = typeof data.event === "string" ? data.event : "";
        if (ev === "ready") {
          subscribed = true;
          subscribe();
          return;
        }
        if (
          data.method === "getDuration" &&
          typeof data.value === "number" &&
          Number.isFinite(data.value) &&
          data.value > 0
        ) {
          duration = data.value;
          return;
        }
        if (ev === "play" || ev === "playing") {
          subscribed = true;
          callbacks.current.onPlay?.();
        } else if (ev === "pause") {
          callbacks.current.onPause?.();
        } else if (ev === "ended" || ev === "finish") {
          callbacks.current.onEnded?.();
        } else if (
          (ev === "timeupdate" || ev === "playProgress") &&
          data.data &&
          typeof data.data === "object"
        ) {
          const info = data.data as Record<string, unknown>;
          if (
            typeof info.duration === "number" &&
            Number.isFinite(info.duration) &&
            info.duration > 0
          ) {
            duration = info.duration;
          }
          if (
            typeof info.seconds === "number" &&
            Number.isFinite(info.seconds) &&
            info.seconds >= 0
          ) {
            callbacks.current.onTimeUpdate?.(info.seconds, duration);
          }
        }
      };

      window.addEventListener("message", onMessage);
      const interval = window.setInterval(() => {
        if (!subscribed) post({ method: "ping" });
      }, 750);
      return () => {
        loadHandlerRef.current = null;
        window.clearInterval(interval);
        window.removeEventListener("message", onMessage);
      };
    }

    // Google Drive e outros players incorporáveis (suporta Player.js + deteção de início por interação no player).
    let hasNativeEvents = false;
    loadHandlerRef.current = null;

    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const data = parseMessageData(event.data);
      if (!data) return;

      const ev = typeof data.event === "string" ? data.event : "";
      if (ev === "ready" && event.origin && event.origin !== "null") {
        for (const name of ["play", "pause", "ended", "timeupdate"]) {
          frame.current?.contentWindow?.postMessage(
            JSON.stringify({
              context: "player.js",
              method: "addEventListener",
              value: name,
            }),
            event.origin
          );
        }
        frame.current?.contentWindow?.postMessage(
          JSON.stringify({ context: "player.js", method: "getDuration" }),
          event.origin
        );
        return;
      }

      if (ev === "play" || ev === "playing") {
        hasNativeEvents = true;
        callbacks.current.onPlay?.();
      } else if (ev === "pause") {
        hasNativeEvents = true;
        callbacks.current.onPause?.();
      } else if (ev === "ended" || ev === "finish") {
        hasNativeEvents = true;
        callbacks.current.onEnded?.();
      } else if (ev === "timeupdate" || ev === "playProgress") {
        const rawInfo = (data.value ?? data.data ?? data) as Record<
          string,
          unknown
        >;
        const dur =
          typeof rawInfo.duration === "number" ? rawInfo.duration : duration;
        if (Number.isFinite(dur) && dur > 0) duration = dur;
        const sec =
          typeof rawInfo.seconds === "number"
            ? rawInfo.seconds
            : typeof rawInfo.currentTime === "number"
              ? rawInfo.currentTime
              : null;
        if (sec !== null && Number.isFinite(sec) && sec >= 0) {
          hasNativeEvents = true;
          if (sec > 0) callbacks.current.onPlay?.();
          callbacks.current.onTimeUpdate?.(sec, duration);
        }
      }
    };

    const onWindowBlur = () => {
      if (!hasNativeEvents && document.activeElement === frame.current) {
        callbacks.current.onPlay?.();
      }
    };

    window.addEventListener("message", onMessage);
    window.addEventListener("blur", onWindowBlur);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, [source.kind, source.src]);

  return (
    <iframe
      ref={frame}
      className={className}
      src={source.src}
      title={title}
      onLoad={() => loadHandlerRef.current?.()}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}
