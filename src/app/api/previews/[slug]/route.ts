import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Track } from "@/models/Track";
import { servePublicFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  await connectDB();
  const track = await Track.findOne({ slug: params.slug }).select("previewKey").lean();
  if (!track?.previewKey) return new Response("Preview not found.", { status: 404 });
  return servePublicFile(track.previewKey, req.headers.get("range") ?? undefined);
}
