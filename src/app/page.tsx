import Link from "next/link";
import { getTracks, getFeaturedTrack, getLicenses, getSoundKits, getServices } from "@/lib/data";
import TrackList from "@/components/TrackList";
import LicenseCards from "@/components/LicenseCards";
import SoundKitCard from "@/components/SoundKitCard";
import ContactForm from "@/components/ContactForm";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [featured, { items: tracks }, licenses, kits, services] = await Promise.all([
    getFeaturedTrack(),
    getTracks({ limit: 20 }),
    getLicenses(),
    getSoundKits(),
    getServices(),
  ]);
  const defaultLicense = licenses.find((l) => !l.exclusive) ?? null;

  return (
    <>
      {featured && (
        <section className="container hero">
          <img src={featured.artworkUrl} alt={featured.title} />
          <div>
            <p className="kicker">Featured track{featured.bpm ? ` • ${featured.bpm} BPM` : ""}</p>
            <h1>{featured.title}</h1>
            <p className="muted">{featured.genres.join(" • ")}</p>
            <div className="hero-actions">
              <Link className="btn" href={`/beat/${featured.slug}`}>
                {money(defaultLicense?.priceCents ?? 0)} &ndash; View licenses
              </Link>
              <Link className="btn in" href="/music/tracks">Browse all tracks</Link>
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="container">
          <h2>Latest tracks</h2>
          <TrackList tracks={tracks} defaultLicense={defaultLicense} />
          <p style={{ textAlign: "center", marginTop: "1.5rem" }}>
            <Link className="btn" href="/music/tracks">BROWSE ALL TRACKS</Link>
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Licensing info</h2>
          <LicenseCards licenses={licenses} />
        </div>
      </section>

      {kits.length > 0 && (
        <section className="section">
          <div className="container">
            <h2>Sound kits</h2>
            <div className="grid">{kits.map((k) => <SoundKitCard key={k.slug} kit={k} />)}</div>
          </div>
        </section>
      )}

      {services.length > 0 && (
        <section className="section">
          <div className="container">
            <h2>Services</h2>
            <div className="grid">
              {services.map((s) => (
                <Link key={s.slug} href={`/contact?subject=${encodeURIComponent(s.title)}`} className="card">
                  <img src={s.imageUrl} alt={s.title} />
                  <h3>{s.title}</h3>
                  <p className="muted">Turnaround: {s.turnaround}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="container">
          <h2>Contact</h2>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
