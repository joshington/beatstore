import path from "path";
import { createReadStream } from "fs";
import { mkdir, stat } from "fs/promises";
import { writeFile } from "fs/promises";
import { Readable } from "stream";

/**
 * Private file storage. Two drivers:
 *  - "local" (default): files live in STORAGE_LOCAL_DIR (default ./storage) and are streamed by the server.
 *    Good for development. Not suitable for serverless hosting (no persistent disk).
 *  - "s3": any S3-compatible bucket (AWS S3, Cloudflare R2, Backblaze B2...). The server only hands the
 *    customer a 2-minute presigned URL after every access check has passed.
 */
const driver = () => process.env.STORAGE_DRIVER ?? "local";
const localBase = () => path.resolve(process.env.STORAGE_LOCAL_DIR ?? "storage");

function resolveLocal(key: string): string | null {
  const base = localBase();
  const full = path.resolve(base, key);
  return full.startsWith(base + path.sep) ? full : null; // blocks ../ traversal
}

export async function fileAvailable(key: string): Promise<boolean> {
  if (driver() === "s3") return true; // checked by S3 itself when the link is used
  const full = resolveLocal(key);
  if (!full) return false;
  try {
    return (await stat(full)).isFile();
  } catch {
    return false;
  }
}

async function presign(key: string, filename: string): Promise<string> {
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be set for STORAGE_DRIVER=s3.");
  }
  const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const endpoint = process.env.S3_ENDPOINT || undefined;
  const client = new S3Client({
    region: process.env.S3_REGION ?? "auto",
    endpoint,
    forcePathStyle: !!endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${filename}"`,
    }),
    { expiresIn: 120 }
  );
}

function contentTypeForKey(key: string): string {
  const ext = path.extname(key).toLowerCase();
  return ({
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".zip": "application/zip",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  } as Record<string, string>)[ext] ?? "application/octet-stream";
}

export async function saveFile(key: string, data: Buffer, contentType: string): Promise<void> {
  if (driver() === "s3") {
    const bucket = process.env.S3_BUCKET;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new Error("S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be set for STORAGE_DRIVER=s3.");
    }
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const endpoint = process.env.S3_ENDPOINT || undefined;
    const client = new S3Client({
      region: process.env.S3_REGION ?? "auto",
      endpoint,
      forcePathStyle: !!endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: data, ContentType: contentType }));
    return;
  }

  const full = resolveLocal(key);
  if (!full) throw new Error("Invalid storage key.");
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data, { flag: "wx" });
}

export async function servePublicFile(key: string, range?: string): Promise<Response> {
  const type = contentTypeForKey(key);
  if (driver() === "s3") {
    const bucket = process.env.S3_BUCKET;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new Error("S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be set for STORAGE_DRIVER=s3.");
    }
    const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const endpoint = process.env.S3_ENDPOINT || undefined;
    const client = new S3Client({
      region: process.env.S3_REGION ?? "auto",
      endpoint,
      forcePathStyle: !!endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
    const url = await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        ResponseContentDisposition: "inline",
        ResponseContentType: type,
      }),
      { expiresIn: 120 }
    );
    return Response.redirect(url, 302);
  }

  const full = resolveLocal(key);
  if (!full) return new Response("Not found.", { status: 404 });
  let size: number;
  try {
    const s = await stat(full);
    if (!s.isFile()) return new Response("Not found.", { status: 404 });
    size = s.size;
  } catch {
    return new Response("Not found.", { status: 404 });
  }

  const headers = new Headers({
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  });
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) {
      headers.set("Content-Range", `bytes */${size}`);
      return new Response(null, { status: 416, headers });
    }
    let start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
    let end = match[2] && match[1] ? Number(match[2]) : size - 1;
    if (start >= size || end < start) {
      headers.set("Content-Range", `bytes */${size}`);
      return new Response(null, { status: 416, headers });
    }
    end = Math.min(end, size - 1);
    headers.set("Content-Length", String(end - start + 1));
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    return new Response(Readable.toWeb(createReadStream(full, { start, end })) as ReadableStream, {
      status: 206,
      headers,
    });
  }

  headers.set("Content-Length", String(size));
  return new Response(Readable.toWeb(createReadStream(full)) as ReadableStream, { headers });
}

/** Returns a Response that delivers the file: a redirect to a short-lived signed URL, or a stream. */
export async function deliverFile(key: string, filename: string): Promise<Response> {
  if (driver() === "s3") {
    return Response.redirect(await presign(key, filename), 302);
  }
  const full = resolveLocal(key);
  if (!full) return new Response("Not found.", { status: 404 });
  let size: number;
  try {
    const s = await stat(full);
    if (!s.isFile()) return new Response("Not found.", { status: 404 });
    size = s.size;
  } catch {
    return new Response("Not found.", { status: 404 });
  }
  const stream = Readable.toWeb(createReadStream(full)) as unknown as ReadableStream;
  return new Response(stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(size),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
