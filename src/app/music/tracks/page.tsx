import Link from "next/link";
import type { Metadata } from "next";
import { getTracks, getLicenses, getGenres } from "@/lib/data";
import TrackList from "@/components/TrackList";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tracks" };

export default async function TracksPage({
  searchParams,
}: {
  searchParams: { q?: string; genre?: string; page?: string };
}) {
  const page = Number(searchParams.page ?? 1) || 1;
  const [{ items, pages, total }, licenses, genres] = await Promise.all([
    getTracks({ q: searchParams.q, genre: searchParams.genre, page, limit: 20 }),
    getLicenses(),
    getGenres(),
  ]);
  const defaultLicense = licenses.find((l) => !l.exclusive) ?? null;

  const href = (p: number) => {
    const sp = new URLSearchParams();
    if (searchParams.q) sp.set("q", searchParams.q);
    if (searchParams.genre) sp.set("genre", searchParams.genre);
    sp.set("page", String(p));
    return `/music/tracks?${sp.toString()}`;
  };

  return (
    <div className="container page">
      <h1>Tracks</h1>
      <p className="muted">
        {total} result{total === 1 ? "" : "s"}
        {searchParams.q ? ` for “${searchParams.q}”` : ""}
      </p>
      <div className="filters">
        <Link href="/music/tracks" className={!searchParams.genre ? "on" : ""}>ALL</Link>
        {genres.map((g) => (
          <Link key={g} href={`/music/tracks?genre=${encodeURIComponent(g)}`} className={searchParams.genre?.toUpperCase() === g ? "on" : ""}>
            {g}
          </Link>
        ))}
      </div>
      {items.length ? <TrackList tracks={items} defaultLicense={defaultLicense} /> : <p>No tracks found.</p>}
      {pages > 1 && (
        <div className="pager">
          {page > 1 && <Link className="btn small" href={href(page - 1)}>&larr; Prev</Link>}
          <span className="muted">Page {page} of {pages}</span>
          {page < pages && <Link className="btn small" href={href(page + 1)}>Next &rarr;</Link>}
        </div>
      )}
    </div>
  );
}
