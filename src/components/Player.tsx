"use client";

import { usePlayer } from "./PlayerContext";
import { duration as fmt } from "@/lib/format";

export default function Player() {
  const { current, playing, progress, duration, toggle, next, prev, seek } = usePlayer();
  if (!current) return null;
  const hasAudio = !!current.audioUrl;
  const frac = duration ? Math.min(1, progress / duration) : 0;

  return (
    <div className="player">
      <img src={current.artworkUrl} alt="" width={48} height={48} />
      <div className="player-meta">
        <strong>{current.title}</strong>
        <span>{hasAudio ? `${fmt(progress)} / ${fmt(duration)}` : "Preview audio not uploaded yet"}</span>
      </div>
      <div className="player-controls">
        <button onClick={prev} aria-label="Previous">&#9198;</button>
        <button onClick={toggle} aria-label={playing ? "Pause" : "Play"} disabled={!hasAudio}>
          {playing ? "⏸" : "▶"}
        </button>
        <button onClick={next} aria-label="Next">&#9197;</button>
      </div>
      <input
        className="seek"
        type="range"
        min={0}
        max={1000}
        value={Math.round(frac * 1000)}
        onChange={(e) => seek(Number(e.target.value) / 1000)}
        disabled={!hasAudio}
        aria-label="Seek"
      />
    </div>
  );
}
