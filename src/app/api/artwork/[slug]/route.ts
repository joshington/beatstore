import { connectDB } from "@/lib/mongodb";
import { Track } from "@/models/Track";
import { servePublicFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  await connectDB();
  const track = await Track.findOne({ slug: params.slug }).select("artworkKey").lean();
  if (!track?.artworkKey) return new Response("Artwork not found.", { status: 404 });
  return servePublicFile(track.artworkKey);
}
