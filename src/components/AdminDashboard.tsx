"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { money } from "@/lib/format";

interface Summary {
  revenueCents: number;
  paidOrders: number;
  users: number;
  tracks: number;
  topTracks: { title: string; plays: number }[];
}

interface LicensePrice {
  slug: string;
  name: string;
  priceCents: number;
  exclusive: boolean;
  deliver: string[];
}

interface AdminTrack {
  slug: string;
  title: string;
  bpm: number;
  durationSec: number;
  genres: string[];
  plays: number;
  free: boolean;
  featured: boolean;
}

export default function AdminDashboard() {
  const formRef = useRef<HTMLFormElement>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [licenses, setLicenses] = useState<LicensePrice[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [tracks, setTracks] = useState<AdminTrack[]>([]);
  const requiredFiles = [...new Set(licenses.filter((license) => !license.exclusive).flatMap((license) => license.deliver))];
  const [loadingError, setLoadingError] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [priceStatus, setPriceStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadDashboard() {
    const [summaryRes, licensesRes, tracksRes] = await Promise.all([
      fetch("/api/admin/summary"),
      fetch("/api/admin/licenses"),
      fetch("/api/admin/tracks"),
    ]);
    if (![summaryRes, licensesRes, tracksRes].every((response) => response.ok)) {
      throw new Error("Could not load dashboard data.");
    }
    const [summaryData, licenseData, trackData] = await Promise.all([
      summaryRes.json(),
      licensesRes.json(),
      tracksRes.json(),
    ]);
    setSummary(summaryData);
    setLicenses(licenseData);
    setPrices(Object.fromEntries(licenseData.map((license: LicensePrice) => [license.slug, (license.priceCents / 100).toFixed(2)])));
    setTracks(trackData);
  }

  useEffect(() => {
    loadDashboard().catch((error: Error) => setLoadingError(error.message));
  }, []);

  async function uploadTrack(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setBusy(true);
    setUploadStatus("");
    try {
      const response = await fetch("/api/admin/tracks", { method: "POST", body: formData });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Could not upload this beat.");
      setUploadStatus(`Published “${formData.get("title")}”.`);
      formRef.current?.reset();
      await loadDashboard();
    } catch (error) {
      setUploadStatus(error instanceof Error ? error.message : "Could not upload this beat.");
    } finally {
      setBusy(false);
    }
  }

  async function savePrices(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setPriceStatus("");
    try {
      const payload = licenses.map(({ slug }) => {
        const dollars = Number(prices[slug]);
        if (!Number.isFinite(dollars) || dollars < 0 || dollars > 100_000) throw new Error("Enter valid non-negative prices.");
        return { slug, priceCents: Math.round(dollars * 100) };
      });
      const response = await fetch("/api/admin/licenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prices: payload }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Could not update prices.");
      setPriceStatus("License prices saved.");
      await loadDashboard();
    } catch (error) {
      setPriceStatus(error instanceof Error ? error.message : "Could not update prices.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container page admin-page">
      <div className="admin-heading">
        <div>
          <p className="kicker">STORE MANAGEMENT</p>
          <h1>Admin dashboard</h1>
          <p className="muted">Manage beat uploads, license pricing and store performance.</p>
        </div>
        <button className="btn secondary" onClick={async () => {
          await fetch("/api/auth", { method: "DELETE" });
          window.location.assign("/account");
        }}>SIGN OUT</button>
      </div>

      {loadingError && <p className="err">{loadingError}</p>}
      {summary && (
        <section className="admin-stats" aria-label="Store statistics">
          <article><span>Revenue generated</span><strong>{money(summary.revenueCents)}</strong></article>
          <article><span>Customers</span><strong>{summary.users}</strong></article>
          <article><span>Beats in store</span><strong>{summary.tracks}</strong></article>
          <article><span>Paid orders</span><strong>{summary.paidOrders}</strong></article>
        </section>
      )}

      <div className="admin-columns">
        <section className="admin-card">
          <h2>Upload a beat</h2>
          <p className="muted">Add catalog details and optional preview, artwork and deliverable files.</p>
          <form ref={formRef} className="form admin-form" onSubmit={uploadTrack}>
            <label>BEAT TITLE<input name="title" required maxLength={120} /></label>
            <div className="form-row">
              <label>BPM<input name="bpm" type="number" min={0} max={300} defaultValue={100} required /></label>
              <label>DURATION (SECONDS)<input name="durationSec" type="number" min={0} max={3600} defaultValue={180} required /></label>
            </div>
            <label>GENRES <small>(comma separated)</small><input name="genres" placeholder="Afrobeat, Amapiano" required /></label>
            <label>TAGS <small>(comma separated)</small><input name="tags" placeholder="smooth, upbeat" /></label>
            <div className="form-row">
              <label>FREE BEAT<select name="free" defaultValue="false"><option value="false">No</option><option value="true">Yes</option></select></label>
              <label>FEATURED<select name="featured" defaultValue="false"><option value="false">No</option><option value="true">Yes</option></select></label>
            </div>
            <label>PREVIEW MP3 <small>(up to 30 MB)</small><input name="preview" type="file" accept=".mp3,audio/mpeg" /></label>
            <label>LICENSE MP3 <small>(up to 50 MB)</small><input name="mp3" type="file" accept=".mp3,audio/mpeg" required={requiredFiles.includes("mp3")} /></label>
            <label>LICENSE WAV <small>(up to 150 MB)</small><input name="wav" type="file" accept=".wav,audio/wav" required={requiredFiles.includes("wav")} /></label>
            <label>STEMS ZIP <small>(up to 300 MB)</small><input name="stems" type="file" accept=".zip,application/zip" required={requiredFiles.includes("stems")} /></label>
            <label>ARTWORK <small>(JPG, PNG or WebP; up to 8 MB)</small><input name="artwork" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" /></label>
            <button className="btn" disabled={busy}>{busy ? "SAVING…" : "PUBLISH BEAT"}</button>
            {uploadStatus && <p className={uploadStatus.startsWith("Published") ? "ok" : "err"}>{uploadStatus}</p>}
          </form>
        </section>

        <div className="admin-side">
          <section className="admin-card">
            <h2>License pricing</h2>
            <p className="muted">Prices apply to all beats, except beats marked free.</p>
            <form className="form price-form" onSubmit={savePrices}>
              {licenses.filter((license) => !license.exclusive).map((license) => (
                <label key={license.slug}>
                  {license.name}
                  <span className="price-input"><span>$</span><input
                    type="number"
                    min="0"
                    max="100000"
                    step="0.01"
                    value={prices[license.slug] ?? ""}
                    onChange={(event) => setPrices((current) => ({ ...current, [license.slug]: event.target.value }))}
                    required
                  /></span>
                </label>
              ))}
              <button className="btn" disabled={busy}>SAVE PRICES</button>
              {priceStatus && <p className={priceStatus.endsWith("saved.") ? "ok" : "err"}>{priceStatus}</p>}
            </form>
          </section>

          <section className="admin-card">
            <h2>Most played beats</h2>
            {summary?.topTracks.length ? (
              <ul className="admin-top-tracks">
                {summary.topTracks.map((track) => <li key={track.title}><span>{track.title}</span><strong>{track.plays} plays</strong></li>)}
              </ul>
            ) : <p className="muted">No plays recorded yet.</p>}
          </section>
        </div>
      </div>

      <section className="admin-card admin-track-card">
        <h2>Catalog</h2>
        <div className="admin-track-list">
          {tracks.map((track) => (
            <div key={track.slug} className="admin-track-row">
              <strong>{track.title}</strong>
              <span>{track.bpm ? `${track.bpm} BPM` : "—"}</span>
              <span>{track.genres.join(", ")}</span>
              <span>{track.free ? "Free" : "Paid"}{track.featured ? " · Featured" : ""}</span>
              <span>{track.plays} plays</span>
            </div>
          ))}
          {!tracks.length && !loadingError && <p className="muted">No beats have been uploaded yet.</p>}
        </div>
      </section>
    </div>
  );
}
