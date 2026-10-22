"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/tracking/client";
import { visualProgress } from "@/lib/video/settings";

interface Props {
  videoUrl: string | null;
  ctaDelaySeconds: number;
  timelineCurve: number;
  stepId: string;
  stepIndex: number;
  ctaLabel: string;
  ctaTrack: string;
  onCta: () => void;
}

export function VslPlayer({
  videoUrl,
  ctaDelaySeconds,
  timelineCurve,
  stepId,
  stepIndex,
  ctaLabel,
  ctaTrack,
  onCta,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const maxTimeRef = useRef(0);
  const playedRef = useRef(false);
  const lastProgressTick = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [barPct, setBarPct] = useState(0);
  const [ctaVisible, setCtaVisible] = useState(ctaDelaySeconds <= 0);
  const [hasEnded, setHasEnded] = useState(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    startedAt.current = Date.now();
    maxTimeRef.current = 0;
    playedRef.current = false;
    setPlaying(false);
    setBarPct(0);
    setHasEnded(false);
    setCtaVisible(ctaDelaySeconds <= 0);
  }, [videoUrl, stepId, ctaDelaySeconds]);

  useEffect(() => {
    if (ctaDelaySeconds <= 0) {
      setCtaVisible(true);
      return;
    }
    const t = window.setTimeout(() => setCtaVisible(true), ctaDelaySeconds * 1000);
    return () => window.clearTimeout(t);
  }, [ctaDelaySeconds, stepId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      track("page_dwell", {
        page: "funnel",
        step_id: stepId,
        step_index: stepIndex,
        element_name: "vsl_player",
        action: "heartbeat",
        duration_ms: Date.now() - startedAt.current,
        dedupe_key: `page_dwell_${stepId}_${Math.floor((Date.now() - startedAt.current) / 10000)}`,
      });
    }, 10000);
    return () => window.clearInterval(id);
  }, [stepId, stepIndex]);

  function enforceNoRewind() {
    const v = videoRef.current;
    if (!v) return;
    if (v.currentTime < maxTimeRef.current - 0.35) {
      v.currentTime = maxTimeRef.current;
    } else if (v.currentTime > maxTimeRef.current) {
      maxTimeRef.current = v.currentTime;
    }
  }

  function updateBar() {
    const v = videoRef.current;
    if (!v || !v.duration || !Number.isFinite(v.duration)) return;
    enforceNoRewind();
    const real = Math.min(1, maxTimeRef.current / v.duration);
    setBarPct(Math.round(visualProgress(real, timelineCurve) * 100));

    const now = Date.now();
    if (now - lastProgressTick.current > 5000 && real > 0) {
      lastProgressTick.current = now;
      track("video_progress", {
        page: "funnel",
        step_id: stepId,
        step_index: stepIndex,
        element_name: "vsl_player",
        action: "progress",
        value: String(Math.round(real * 100)),
        duration_ms: Math.round(maxTimeRef.current * 1000),
        metadata: {
          visual_pct: Math.round(visualProgress(real, timelineCurve) * 100),
        },
      });
    }
  }

  async function togglePlay() {
    const v = videoRef.current;
    if (!v || !videoUrl) return;
    if (v.paused) {
      try {
        await v.play();
        setPlaying(true);
        if (!playedRef.current) {
          playedRef.current = true;
          track("video_play", {
            page: "funnel",
            step_id: stepId,
            step_index: stepIndex,
            element_name: "vsl_player",
            action: "play",
          });
        }
      } catch {
        /* autoplay bloqueado — utilizador pode tentar de novo */
      }
    } else {
      v.pause();
      setPlaying(false);
    }
  }

  return (
    <>
      <div className="vsl-wrap">
        <div className={`vsl${videoUrl ? " has-video" : ""}`}>
          {videoUrl ? (
            <video
              ref={videoRef}
              className="vsl-video"
              src={videoUrl}
              playsInline
              preload="metadata"
              controls={false}
              disablePictureInPicture
              controlsList="nodownload noplaybackrate noremoteplayback"
              onTimeUpdate={updateBar}
              onSeeking={enforceNoRewind}
              onSeeked={enforceNoRewind}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => {
                setHasEnded(true);
                setPlaying(false);
                setBarPct(100);
                setCtaVisible(true);
                track("video_ended", {
                  page: "funnel",
                  step_id: stepId,
                  step_index: stepIndex,
                  element_name: "vsl_player",
                  action: "ended",
                  duration_ms: Math.round((videoRef.current?.duration || 0) * 1000),
                });
              }}
              onContextMenu={(e) => e.preventDefault()}
            />
          ) : (
            <div className="vsl-empty" aria-hidden />
          )}

          {!playing && !hasEnded && (
            <button
              type="button"
              className="vsl-play"
              aria-label="Reproduzir vídeo"
              data-track="vsl_play"
              onClick={() => void togglePlay()}
              disabled={!videoUrl}
            >
              ▶
            </button>
          )}

          {playing && (
            <button
              type="button"
              className="vsl-tap"
              aria-label="Pausar"
              onClick={() => void togglePlay()}
            />
          )}

          <div className="vsl-scrub" aria-hidden>
            <div style={{ width: `${barPct}%` }} />
          </div>
        </div>
      </div>

      {ctaVisible ? (
        <button
          type="button"
          className="btn btn-primary"
          data-track={ctaTrack}
          onClick={onCta}
        >
          {ctaLabel}
        </button>
      ) : (
        <p className="vsl-cta-wait" aria-live="polite">
          O botão aparece em breve…
        </p>
      )}
    </>
  );
}
