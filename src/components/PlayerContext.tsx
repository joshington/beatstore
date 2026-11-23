"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import type { TrackDTO } from "@/lib/types";

interface PlayerState {
  current: TrackDTO | null;
  playing: boolean;
  progress: number;
  duration: number;
  playQueue: (queue: TrackDTO[], index: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (fraction: number) => void;
}

const PlayerContext = createContext<PlayerState | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [queue, setQueue] = useState<TrackDTO[]>([]);
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const current = index >= 0 ? queue[index] ?? null : null;

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    setProgress(0);
    if (!current || !current.audioUrl) {
      a.pause();
      a.removeAttribute("src");
      setPlaying(false);
      setDuration(current?.durationSec ?? 0);
      return;
    }
    a.src = current.audioUrl;
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    fetch(`/api/tracks/${current.slug}`, { method: "POST" }).catch(() => {});
  }, [current?.slug, current?.audioUrl]);

  const playQueue = useCallback((q: TrackDTO[], i: number) => {
    setQueue(q);
    setIndex(i);
  }, []);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a || !a.getAttribute("src")) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  }, []);

  const next = useCallback(() => setIndex((i) => (i + 1 < queue.length ? i + 1 : i)), [queue.length]);
  const prev = useCallback(() => setIndex((i) => (i > 0 ? i - 1 : i)), []);

  const seek = useCallback((fraction: number) => {
    const a = audioRef.current;
    if (a && a.duration) a.currentTime = fraction * a.duration;
  }, []);

  const value: PlayerState = { current, playing, progress, duration, playQueue, toggle, next, prev, seek };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={next}
      />
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerState {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return ctx;
}
