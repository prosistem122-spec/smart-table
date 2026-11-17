"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { journeyMilestone } from "@/lib/tracking/journey";
import { track } from "@/lib/tracking/client";
import { ExternalVideoPlayer } from "./ExternalVideoPlayer";
import { resolveVideoSource, type VideoSourceMode } from "@/lib/video/source";
import { visualProgress } from "@/lib/video/settings";

interface Props {
  videoUrl: string | null;
  sourceMode: VideoSourceMode;
  ctaDelaySeconds: number;
  timelineCurve: number;
  frameWidth: number;
  settingsReady?: boolean;
  stepId: string;
  stepIndex: number;
  ctaLabel: string;
  ctaTrack: string;
  onCta: () => void;
}

function computeVisualPct(realProgress: number, curve: number): number {
  const pct = visualProgress(realProgress, curve) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)) * 10) / 10;
}

export function VslPlayer({
  videoUrl,
  sourceMode,
  ctaDelaySeconds,
  timelineCurve,
  frameWidth,
  settingsReady = true,
  stepId,
  stepIndex,
  ctaLabel,
  ctaTrack,
  onCta,
}: Props) {
  const source = settingsReady ? resolveVideoSource(videoUrl, sourceMode) : null;
  const embedded = Boolean(source && source.kind !== "direct");

  const safeDelaySeconds = Number.isFinite(ctaDelaySeconds)
    ? Math.max(0, ctaDelaySeconds)
    : 0;
  const safeDelayMs = safeDelaySeconds * 1000;
  const safeCurve = Number.isFinite(timelineCurve)
    ? Math.min(5, Math.max(1, timelineCurve))
    : 2.2;
  const safeWidth = Number.isFinite(frameWidth)
    ? Math.min(500, Math.max(160, frameWidth))
    : 280;

  const videoRef = useRef<HTMLVideoElement>(null);
  const maxTimeRef = useRef(0);
  const durationRef = useRef(0);
  const realProgressRef = useRef(0);
  const watchedMsRef = useRef(0);
  const playSegmentStartRef = useRef<number | null>(null);
  const hasStartedRef = useRef(false);
  const playedTrackedRef = useRef(false);
  const unlockedForDelayRef = useRef<number | null>(null);
  const ctaTimerRef = useRef<number | null>(null);
  const lastProgressTick = useRef(0);
  const pageOpenedAt = useRef(Date.now());

  const configRef = useRef({
    safeDelayMs,
    safeDelaySeconds,
    safeCurve,
    settingsReady,
    stepId,
    stepIndex,
  });
  configRef.current = {
    safeDelayMs,
    safeDelaySeconds,
    safeCurve,
    settingsReady,
    stepId,
    stepIndex,
  };

  const [hasStarted, setHasStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [barPct, setBarPct] = useState(0);
  // O botão nunca aparece antes de o vídeo começar, mesmo com delay 0.
  const [ctaVisible, setCtaVisible] = useState(false);

  const getWatchedMs = useCallback(() => {
    const activeMs =
      playSegmentStartRef.current !== null
        ? Math.max(0, Date.now() - playSegmentStartRef.current)
        : 0;
    return watchedMsRef.current + activeMs;
  }, []);

  const clearCtaTimer = useCallback(() => {
    if (ctaTimerRef.current !== null) {
      window.clearTimeout(ctaTimerRef.current);
      ctaTimerRef.current = null;
    }
  }, []);

  const flushPlaySegment = useCallback(() => {
    if (playSegmentStartRef.current !== null) {
      watchedMsRef.current += Math.max(
        0,
        Date.now() - playSegmentStartRef.current
      );
      playSegmentStartRef.current = null;
    }
  }, []);

  // Reinicia estado apenas quando muda o vídeo, modo de fonte ou etapa.
  useEffect(() => {
    pageOpenedAt.current = Date.now();
    maxTimeRef.current = 0;
    durationRef.current = 0;
    realProgressRef.current = 0;
    watchedMsRef.current = 0;
    playSegmentStartRef.current = null;
    hasStartedRef.current = false;
    playedTrackedRef.current = false;
    unlockedForDelayRef.current = null;
    lastProgressTick.current = 0;
    setHasStarted(false);
    setPlaying(false);
    setHasEnded(false);
    setBarPct(0);
    setCtaVisible(false);
  }, [videoUrl, sourceMode, stepId]);

  // Recalcula imediatamente a barra quando a curva configurada no Admin é carregada/alterada.
  useEffect(() => {
    if (hasEnded) {
      setBarPct(100);
      return;
    }
    if (!hasStarted || realProgressRef.current <= 0) {
      setBarPct(0);
      return;
    }
    setBarPct(computeVisualPct(realProgressRef.current, safeCurve));
  }, [safeCurve, hasStarted, hasEnded]);

  // Temporizador do CTA: só conta após o vídeo iniciar e respeita o delay do Admin.
  useEffect(() => {
    clearCtaTimer();
    if (!settingsReady || !hasStarted) {
      setCtaVisible(false);
      return;
    }
    if (
      hasEnded ||
      safeDelayMs <= 0 ||
      unlockedForDelayRef.current === safeDelayMs
    ) {
      unlockedForDelayRef.current = safeDelayMs;
      setCtaVisible(true);
      return;
    }
    const remaining = safeDelayMs - getWatchedMs();
    if (remaining <= 0) {
      unlockedForDelayRef.current = safeDelayMs;
      setCtaVisible(true);
      return;
    }
    setCtaVisible(false);
    if (!playing) return;
    ctaTimerRef.current = window.setTimeout(() => {
      ctaTimerRef.current = null;
      if (playSegmentStartRef.current === null) return;
      if (getWatchedMs() + 10 >= safeDelayMs) {
        unlockedForDelayRef.current = safeDelayMs;
        setCtaVisible(true);
      }
    }, remaining);
    return clearCtaTimer;
  }, [
    settingsReady,
    hasStarted,
    hasEnded,
    playing,
    safeDelayMs,
    getWatchedMs,
    clearCtaTimer,
  ]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const elapsed = Date.now() - pageOpenedAt.current;
      track("page_dwell", {
        page: "funnel",
        step_id: stepId,
        step_index: stepIndex,
        element_name: "vsl_player",
        action: "heartbeat",
        duration_ms: elapsed,
        dedupe_key: `page_dwell_${stepId}_${Math.floor(elapsed / 10000)}`,
      });
    }, 10000);
    return () => window.clearInterval(id);
  }, [stepId, stepIndex]);

  const applyProgress = useCallback((currentTime: number, duration: number) => {
    const {
      safeCurve: curve,
      stepId: sId,
      stepIndex: sIdx,
    } = configRef.current;

    if (Number.isFinite(currentTime) && currentTime > maxTimeRef.current) {
      maxTimeRef.current = currentTime;
    }
    if (Number.isFinite(duration) && duration > 0) {
      durationRef.current = duration;
    }

    if (durationRef.current > 0 && hasStartedRef.current) {
      const real = Math.min(1, Math.max(0, maxTimeRef.current / durationRef.current));
      realProgressRef.current = real;
      const visualPct = computeVisualPct(real, curve);
      setBarPct(visualPct);

      const now = Date.now();
      if (now - lastProgressTick.current > 5000 && real > 0) {
        lastProgressTick.current = now;
        track("video_progress", {
          page: "funnel",
          step_id: sId,
          step_index: sIdx,
          element_name: "vsl_player",
          action: "progress",
          value: String(Math.round(real * 100)),
          duration_ms: Math.round(maxTimeRef.current * 1000),
          metadata: { visual_pct: Math.round(visualPct) },
        });
      }
    }
  }, []);

  const enforceNoRewind = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.currentTime < maxTimeRef.current - 0.35) {
      v.currentTime = maxTimeRef.current;
    } else if (v.currentTime > maxTimeRef.current) {
      maxTimeRef.current = v.currentTime;
    }
  }, []);

  const syncDirectVideo = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    enforceNoRewind();
    const dur =
      Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
    applyProgress(maxTimeRef.current, dur);
  }, [applyProgress, enforceNoRewind]);

  // Atualização contínua da barra durante a reprodução (ficheiros directos e players externos).
  useEffect(() => {
    if (!playing || !hasStarted || hasEnded) return;
    const id = window.setInterval(() => {
      if (!embedded) {
        syncDirectVideo();
        return;
      }
      if (durationRef.current > 0) return;
      const { safeCurve: curve, safeDelaySeconds: delaySec } = configRef.current;
      const watchedSec = getWatchedMs() / 1000;
      const referenceDuration = Math.max(
        delaySec > 0 ? delaySec * 1.5 : 120,
        60
      );
      const estimatedReal = Math.min(0.96, watchedSec / referenceDuration);
      if (estimatedReal > realProgressRef.current) {
        realProgressRef.current = estimatedReal;
        setBarPct(computeVisualPct(estimatedReal, curve));
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [playing, hasStarted, hasEnded, embedded, syncDirectVideo, getWatchedMs]);

  const handlePlay = useCallback(() => {
    const { settingsReady: ready, stepId: sId, stepIndex: sIdx } =
      configRef.current;
    if (!ready) return;

    hasStartedRef.current = true;
    if (playSegmentStartRef.current === null) {
      playSegmentStartRef.current = Date.now();
    }
    setHasStarted(true);
    setHasEnded(false);
    setPlaying(true);

    if (!playedTrackedRef.current) {
      playedTrackedRef.current = true;
      if (sId === "hero_intro") journeyMilestone("video_played_at");
      track("video_play", {
        page: "funnel",
        step_id: sId,
        step_index: sIdx,
        element_name: "vsl_player",
        action: "play",
      });
    }
  }, []);

  const handlePause = useCallback(() => {
    clearCtaTimer();
    flushPlaySegment();
    setPlaying(false);
  }, [clearCtaTimer, flushPlaySegment]);

  const handleEnded = useCallback(
    (durationMs = 0) => {
      const { stepId: sId, stepIndex: sIdx } = configRef.current;
      flushPlaySegment();
      hasStartedRef.current = true;
      realProgressRef.current = 1;
      setHasStarted(true);
      setHasEnded(true);
      setPlaying(false);
      setBarPct(100);
      setCtaVisible(true);
      const reportedMs =
        durationMs || Math.round(durationRef.current * 1000) || Math.round(getWatchedMs());
      track("video_ended", {
        page: "funnel",
        step_id: sId,
        step_index: sIdx,
        element_name: "vsl_player",
        action: "ended",
        duration_ms: reportedMs,
      });
    },
    [flushPlaySegment, getWatchedMs]
  );

  const handleExternalTimeUpdate = useCallback(
    (currentTime: number, duration: number) => {
      if (!hasStartedRef.current) return;
      applyProgress(currentTime, duration);
    },
    [applyProgress]
  );

  async function togglePlay() {
    const v = videoRef.current;
    if (!v || !source) return;
    if (v.paused) {
      try {
        await v.play();
        handlePlay();
      } catch {
        /* autoplay bloqueado — utilizador pode tentar de novo */
      }
    } else {
      v.pause();
      handlePause();
    }
  }

  return (
    <>
      <div className="vsl-wrap">
        <div
          className={`vsl${source ? " has-video" : ""}`}
          style={{ width: safeWidth }}
        >
          {source && embedded ? (
            <ExternalVideoPlayer
              source={source}
              className="vsl-video"
              title="Vídeo da apresentação"
              onPlay={handlePlay}
              onPause={handlePause}
              onEnded={() => handleEnded()}
              onTimeUpdate={handleExternalTimeUpdate}
            />
          ) : source ? (
            <video
              ref={videoRef}
              className="vsl-video"
              src={source.src}
              playsInline
              preload="metadata"
              controls={false}
              disablePictureInPicture
              controlsList="nodownload noplaybackrate noremoteplayback"
              onLoadedMetadata={() => {
                const dur = videoRef.current?.duration || 0;
                if (Number.isFinite(dur) && dur > 0) {
                  durationRef.current = dur;
                }
              }}
              onTimeUpdate={syncDirectVideo}
              onSeeking={enforceNoRewind}
              onSeeked={enforceNoRewind}
              onPlay={handlePlay}
              onPlaying={handlePlay}
              onWaiting={handlePause}
              onPause={handlePause}
              onEnded={() =>
                handleEnded(Math.round((videoRef.current?.duration || 0) * 1000))
              }
              onContextMenu={(e) => e.preventDefault()}
            />
          ) : (
            <div className="vsl-empty" aria-hidden />
          )}

          {!embedded && !playing && !hasEnded && (
            <button
              type="button"
              className="vsl-play"
              aria-label="Reproduzir vídeo"
              data-track="vsl_play"
              onClick={() => void togglePlay()}
              disabled={!source}
            >
              ▶
            </button>
          )}

          {!embedded && playing && (
            <button
              type="button"
              className="vsl-tap"
              aria-label="Pausar"
              onClick={() => void togglePlay()}
            />
          )}

          <div
            className="vsl-scrub"
            role="progressbar"
            aria-label="Progresso do vídeo"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(barPct)}
            data-curve={safeCurve}
          >
            <div style={{ width: `${barPct}%` }} />
          </div>
        </div>
      </div>

      {ctaVisible && (
        <button
          type="button"
          className="btn btn-primary"
          data-track={ctaTrack}
          onClick={onCta}
        >
          {ctaLabel}
        </button>
      )}
    </>
  );
}
