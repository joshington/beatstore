import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Track } from "@/models/Track";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  await connectDB();
  const track = await Track.findOneAndUpdate(
    { slug: params.slug },
    { $inc: { plays: 0 } },
    { new: true }
  ).lean();
  if (!track) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(track);
}

export async function POST(_req: Request, { params }: { params: { slug: string } }) {
  // Increment play counter (called by the player when playback starts)
  await connectDB();
  await Track.updateOne({ slug: params.slug }, { $inc: { plays: 1 } });
  return NextResponse.json({ ok: true });
}
