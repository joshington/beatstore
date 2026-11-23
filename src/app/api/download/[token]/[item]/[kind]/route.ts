import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Track } from "@/models/Track";
import { SoundKit } from "@/models/SoundKit";
import {
  downloadFilename,
  isExpired,
  isFileKind,
  maxDownloadsPerItem,
  verifyOrderToken,
  type FileKind,
} from "@/lib/downloads";
import { deliverFile, fileAvailable } from "@/lib/storage";

export const dynamic = "force-dynamic";

const text = (message: string, status: number) =>
  new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

/**
 * GET /api/download/<token>/<itemIndex>/<kind>
 * Checks, in order: token is genuine, order is paid, link not expired, the license includes this file,
 * the download cap has not been reached, and the file exists. Only then is a download counted and served.
 */
export async function GET(
  _req: Request,
  { params }: { params: { token: string; item: string; kind: string } }
) {
  const orderId = verifyOrderToken(params.token);
  if (!orderId) return text("Invalid download link.", 404);
  if (!isFileKind(params.kind)) return text("Unknown file.", 404);
  const kind: FileKind = params.kind;
  const idx = Number(params.item);
  if (!Number.isInteger(idx) || idx < 0) return text("Unknown file.", 404);

  await connectDB();
  const order = await Order.findById(orderId).lean();
  if (!order || order.status !== "paid") return text("This order has not been paid.", 403);
  if (isExpired(order.paidAt)) {
    return text("This download link has expired. Request a fresh link at /downloads/lost.", 410);
  }

  const item = order.items[idx];
  if (!item || !(item.deliver ?? []).includes(kind)) return text("Unknown file.", 404);

  const max = maxDownloadsPerItem();
  if ((item.downloads ?? 0) >= max) {
    return text("Download limit reached for this item. Please contact us for help.", 429);
  }

  let key = "";
  if (item.kind === "track" && kind !== "kit") {
    const track = await Track.findOne({ slug: item.refId }).lean();
    key = (track?.files as Record<string, string> | undefined)?.[kind] ?? "";
  } else if (item.kind === "soundkit" && kind === "kit") {
    const kit = await SoundKit.findOne({ slug: item.refId }).lean();
    key = kit?.fileKey ?? "";
  }
  if (!key || !(await fileAvailable(key))) {
    return text("This file isn't available yet. Please contact us and we'll sort it out.", 404);
  }

  // Count the download atomically, refusing if another request just used the last one.
  const counted = await Order.updateOne(
    { _id: orderId, [`items.${idx}.downloads`]: { $lt: max } },
    { $inc: { [`items.${idx}.downloads`]: 1 } }
  );
  if (counted.modifiedCount === 0) return text("Download limit reached for this item.", 429);

  return deliverFile(key, downloadFilename(item.refId, kind, key));
}
