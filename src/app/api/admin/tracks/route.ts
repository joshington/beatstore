import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Track } from "@/models/Track";
import { License } from "@/models/License";
import { saveFile } from "@/lib/storage";
import { placeholderArt, slugify } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_SIZES = {
  preview: 30 * 1024 * 1024,
  mp3: 50 * 1024 * 1024,
  wav: 150 * 1024 * 1024,
  stems: 300 * 1024 * 1024,
  artwork: 8 * 1024 * 1024,
} as const;

const detailsSchema = z.object({
  title: z.string().trim().min(1).max(120),
  bpm: z.coerce.number().int().min(0).max(300),
  durationSec: z.coerce.number().int().min(0).max(3600),
  genres: z.string().trim().min(1).max(160),
  tags: z.string().trim().max(300),
  free: z.enum(["true", "false"]),
  featured: z.enum(["true", "false"]),
});

function isFile(value: FormDataEntryValue | null): value is File {
  return typeof value === "object" && value !== null && "arrayBuffer" in value && value.size > 0;
}

function validType(file: File, kind: keyof typeof MAX_FILE_SIZES): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (kind === "artwork") {
    return (file.type === "image/jpeg" && ["jpg", "jpeg"].includes(extension ?? "")) ||
      (file.type === "image/png" && extension === "png") ||
      (file.type === "image/webp" && extension === "webp");
  }
  if (kind === "stems") return ["application/zip", "application/x-zip-compressed"].includes(file.type) && extension === "zip";
  if (kind === "wav") return ["audio/wav", "audio/x-wav", "audio/wave"].includes(file.type) && extension === "wav";
  return ["audio/mpeg", "audio/mp3"].includes(file.type) && extension === "mp3";
}

const getContentType = (file: File) => file.type || "application/octet-stream";

export async function POST(req: NextRequest) {
  if (getSession()?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const form = await req.formData();
  const parsed = detailsSchema.safeParse({
    title: form.get("title"),
    bpm: form.get("bpm"),
    durationSec: form.get("durationSec"),
    genres: form.get("genres"),
    tags: form.get("tags") ?? "",
    free: form.get("free"),
    featured: form.get("featured"),
  });
  if (!parsed.success) return NextResponse.json({ error: "Check the beat details and try again." }, { status: 400 });

  const files = {
    preview: form.get("preview"),
    mp3: form.get("mp3"),
    wav: form.get("wav"),
    stems: form.get("stems"),
    artwork: form.get("artwork"),
  };
  for (const [kind, value] of Object.entries(files) as [keyof typeof MAX_FILE_SIZES, FormDataEntryValue | null][]) {
    if (!isFile(value)) continue;
    if (value.size > MAX_FILE_SIZES[kind] || !validType(value, kind)) {
      return NextResponse.json({ error: `Invalid ${kind} file or file too large.` }, { status: 400 });
    }
  }

  await connectDB();
  const requiredFiles = new Set(
    (await License.distinct("deliver", { exclusive: false })).filter(
      (kind): kind is "mp3" | "wav" | "stems" => ["mp3", "wav", "stems"].includes(kind)
    )
  );
  const missingFiles = [...requiredFiles].filter((kind) => !isFile(files[kind]));
  if (missingFiles.length) {
    return NextResponse.json(
      { error: `Upload the deliverable files required by your licenses: ${missingFiles.join(", ")}.` },
      { status: 400 }
    );
  }

  const title = parsed.data.title;
  const slug = slugify(title);
  if (!slug) return NextResponse.json({ error: "The title must contain letters or numbers." }, { status: 400 });
  if (await Track.exists({ slug })) return NextResponse.json({ error: "A beat with that title already exists." }, { status: 409 });

  const save = async (kind: keyof typeof MAX_FILE_SIZES, key: string) => {
    const file = files[kind];
    if (!isFile(file)) return "";
    await saveFile(key, Buffer.from(await file.arrayBuffer()), getContentType(file));
    return key;
  };

  const previewKey = await save("preview", `tracks/${slug}/${slug}-preview.mp3`);
  const mp3 = await save("mp3", `tracks/${slug}/${slug}.mp3`);
  const wav = await save("wav", `tracks/${slug}/${slug}.wav`);
  const stems = await save("stems", `tracks/${slug}/${slug}-stems.zip`);
  const artworkKey = await save("artwork", `tracks/${slug}/${slug}-artwork.${files.artwork instanceof File ? files.artwork.name.split(".").pop()?.toLowerCase() : "jpg"}`);
  const genres = parsed.data.genres.split(",").map((item) => item.trim().toUpperCase()).filter(Boolean);
  const tags = parsed.data.tags.split(",").map((item) => item.trim()).filter(Boolean);
  const track = await Track.create({
    slug,
    title,
    bpm: parsed.data.bpm,
    durationSec: parsed.data.durationSec,
    genres: [...new Set(genres)],
    tags: [...new Set(tags)],
    artworkUrl: artworkKey ? `/api/artwork/${slug}` : placeholderArt(slug, title),
    artworkKey,
    audioUrl: previewKey ? `/api/previews/${slug}` : "",
    previewKey,
    files: { mp3, wav, stems },
    free: parsed.data.free === "true",
    featured: parsed.data.featured === "true",
  });
  return NextResponse.json({ slug: track.slug }, { status: 201 });
}

export async function GET() {
  if (getSession()?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  await connectDB();
  const tracks = await Track.find()
    .sort({ publishedAt: -1 })
    .select("slug title bpm durationSec genres free featured plays publishedAt")
    .lean();
  return NextResponse.json(tracks);
}
