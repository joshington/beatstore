"use client";

import Link from "next/link";
import { usePlayer } from "./PlayerContext";
import { useCart } from "./CartContext";
import { duration as fmt, money } from "@/lib/format";
import type { TrackDTO, LicenseDTO } from "@/lib/types";

export default function TrackList({
  tracks,
  defaultLicense,
}: {
  tracks: TrackDTO[];
  defaultLicense: LicenseDTO | null;
}) {
  const { current, playing, playQueue, toggle } = usePlayer();
  const cart = useCart();

  return (
    <ul className="track-list">
      <li className="track-head">
        <span>BEAT</span>
        <span>PREVIEW / TIME / BPM</span>
        <span>TAGS</span>
        <span />
      </li>
      {tracks.map((t, i) => {
        const isCurrent = current?.slug === t.slug;
        const price = t.free ? 0 : defaultLicense?.priceCents ?? 0;
        const inCart = cart.has("track", t.slug);
        return (
          <li key={t.slug} className={`track-row${isCurrent ? " active" : ""}`}>
            <div className="track-title">
              <img src={t.artworkUrl} alt="" width={48} height={48} />
              <Link href={`/beat/${t.slug}`}>{t.title}</Link>
            </div>
            <div className="track-meta">
              <button
                className="row-play"
                aria-label={isCurrent && playing ? "Pause" : "Play"}
                onClick={() => (isCurrent ? toggle() : playQueue(tracks, i))}
              >
                {isCurrent && playing ? "⏸" : "▶"}
              </button>
              <span>{fmt(t.durationSec)}</span>
              {t.bpm ? <span>{t.bpm} BPM</span> : null}
            </div>
            <span className="tags">
              {t.genres.map((g) => (
                <Link key={g} href={`/music/tracks?genre=${encodeURIComponent(g)}`} className="tag">
                  {g}
                </Link>
              ))}
            </span>
            <span>
              {defaultLicense && (
                <button
                  className={`btn small${inCart ? " in" : ""}`}
                  onClick={() =>
                    cart.add({
                      kind: "track",
                      slug: t.slug,
                      title: t.title,
                      artworkUrl: t.artworkUrl,
                      licenseSlug: defaultLicense.slug,
                      licenseName: defaultLicense.name,
                      priceCents: price,
                    })
                  }
                >
                  {money(price)} {inCart ? "IN CART" : "ADD"}
                </button>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
