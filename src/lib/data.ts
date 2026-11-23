import { connectDB } from "./mongodb";
import { Track } from "@/models/Track";
import { License } from "@/models/License";
import { SoundKit } from "@/models/SoundKit";
import { Service } from "@/models/Service";
import type { TrackDTO, LicenseDTO, SoundKitDTO, ServiceDTO } from "./types";

type Lean = Record<string, any>;

const toTrack = (t: Lean): TrackDTO => ({
  slug: t.slug,
  title: t.title,
  bpm: t.bpm ?? 0,
  durationSec: t.durationSec ?? 0,
  genres: t.genres ?? [],
  tags: t.tags ?? [],
  artworkUrl: t.artworkUrl ?? "",
  audioUrl: t.audioUrl ?? "",
  free: !!t.free,
  featured: !!t.featured,
});

const toLicense = (l: Lean): LicenseDTO => ({
  slug: l.slug,
  name: l.name,
  priceCents: l.priceCents ?? 0,
  exclusive: !!l.exclusive,
  popular: !!l.popular,
  files: l.files ?? [],
  terms: l.terms ?? [],
});

export async function getTracks(opts: { q?: string; genre?: string; page?: number; limit?: number } = {}) {
  await connectDB();
  const page = Math.max(1, opts.page ?? 1);
  const limit = opts.limit ?? 20;
  const filter: Record<string, unknown> = {};
  if (opts.q) filter.$text = { $search: opts.q };
  if (opts.genre) filter.genres = opts.genre.toUpperCase();
  const [rows, total] = await Promise.all([
    Track.find(filter).sort({ publishedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Track.countDocuments(filter),
  ]);
  return { items: rows.map(toTrack), total, pages: Math.max(1, Math.ceil(total / limit)), page };
}

export async function getTrack(slug: string): Promise<TrackDTO | null> {
  await connectDB();
  const t = await Track.findOne({ slug }).lean();
  return t ? toTrack(t) : null;
}

export async function getFeaturedTrack(): Promise<TrackDTO | null> {
  await connectDB();
  const t = (await Track.findOne({ featured: true }).lean()) ?? (await Track.findOne().sort({ publishedAt: -1 }).lean());
  return t ? toTrack(t) : null;
}

export async function getGenres(): Promise<string[]> {
  await connectDB();
  const g = await Track.distinct("genres");
  return (g as string[]).sort();
}

export async function getLicenses(): Promise<LicenseDTO[]> {
  await connectDB();
  const rows = await License.find().sort({ sortOrder: 1 }).lean();
  return rows.map(toLicense);
}

export async function getSoundKits(): Promise<SoundKitDTO[]> {
  await connectDB();
  const rows = await SoundKit.find().sort({ createdAt: -1 }).lean();
  return rows.map((k) => ({
    slug: k.slug,
    title: k.title,
    description: k.description ?? "",
    priceCents: k.priceCents ?? 0,
    artworkUrl: k.artworkUrl ?? "",
  }));
}

export async function getServices(): Promise<ServiceDTO[]> {
  await connectDB();
  const rows = await Service.find().sort({ createdAt: -1 }).lean();
  return rows.map((s) => ({
    slug: s.slug,
    title: s.title,
    description: s.description ?? "",
    turnaround: s.turnaround ?? "",
    needs: s.needs ?? "",
    priceCents: s.priceCents ?? 0,
    imageUrl: s.imageUrl ?? "",
  }));
}
