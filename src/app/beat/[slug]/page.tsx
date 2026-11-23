import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTrack, getLicenses, getTracks } from "@/lib/data";
import LicensePicker from "@/components/LicensePicker";
import TrackList from "@/components/TrackList";
import { duration } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const t = await getTrack(params.slug);
  return { title: t?.title ?? "Track" };
}

export default async function BeatPage({ params }: { params: { slug: string } }) {
  const track = await getTrack(params.slug);
  if (!track) notFound();
  const [licenses, related] = await Promise.all([
    getLicenses(),
    getTracks({ genre: track.genres[0], limit: 6 }),
  ]);
  const defaultLicense = licenses.find((l) => !l.exclusive) ?? null;

  return (
    <div className="container page">
      <div className="detail">
        <img src={track.artworkUrl} alt={track.title} />
        <div>
          <h1>{track.title}</h1>
          <p className="muted">
            {track.bpm ? `${track.bpm} BPM • ` : ""}
            {duration(track.durationSec)} &bull; {track.genres.join(", ")}
          </p>
          <p>{track.tags.map((t) => `#${t}`).join(" ")}</p>
          <LicensePicker track={track} licenses={licenses} />
        </div>
      </div>
      <section className="section">
        <h2>More like this</h2>
        <TrackList tracks={related.items.filter((t) => t.slug !== track.slug)} defaultLicense={defaultLicense} />
      </section>
    </div>
  );
}
