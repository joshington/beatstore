import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Track } from "@/models/Track";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const genre = sp.get("genre")?.trim();
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit") ?? 20)));

  await connectDB();
  const filter: Record<string, unknown> = {};
  if (q) filter.$text = { $search: q };
  if (genre) filter.genres = genre.toUpperCase();

  const [items, total] = await Promise.all([
    Track.find(filter).sort({ publishedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Track.countDocuments(filter),
  ]);
  return NextResponse.json({ items, total, page, pages: Math.ceil(total / limit) });
}
