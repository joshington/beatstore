import mongoose from "mongoose";
import { Track } from "../src/models/Track";
import { License } from "../src/models/License";
import { Order } from "../src/models/Order";
import { sanitizeDeliver } from "../src/lib/downloads";
import { downloadPageUrl, fulfillOrder } from "../src/lib/fulfillment";

/**
 * End-to-end delivery test WITHOUT paying: creates an already-paid order for the given e-mail,
 * sends the real delivery e-mail (or prints it if RESEND_API_KEY is not set) and prints the download page URL.
 *
 *   npm run test:delivery -- you@example.com
 */
const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/beatstore";

async function main() {
  const email = process.argv[2];
  if (!email || !email.includes("@")) {
    console.error("Usage: npm run test:delivery -- you@example.com");
    process.exit(1);
  }
  await mongoose.connect(uri);

  const tracks = await Track.find().sort({ publishedAt: -1 }).limit(2).lean();
  const licenses = await License.find({ exclusive: false }).sort({ sortOrder: 1 }).lean();
  const mp3 = licenses.find((l) => l.slug === "mp3-lease");
  const stems = licenses.find((l) => l.slug === "unlimited-stems");
  if (tracks.length < 2 || !mp3 || !stems) {
    console.error("Run `npm run seed` first.");
    process.exit(1);
  }

  const items = [
    { t: tracks[0], l: mp3 },
    { t: tracks[1], l: stems },
  ].map(({ t, l }) => ({
    kind: "track" as const,
    refId: t.slug,
    title: t.title,
    licenseSlug: l.slug,
    licenseName: l.name,
    priceCents: l.priceCents,
    deliver: sanitizeDeliver(l.deliver),
  }));
  const total = items.reduce((s, i) => s + i.priceCents, 0);

  const order = await Order.create({
    email,
    items,
    subtotalCents: total,
    totalCents: total,
    currency: process.env.NEXT_PUBLIC_CURRENCY ?? process.env.FLW_CURRENCY ?? "UGX",
    txRef: `test_${Date.now()}`,
    status: "paid",
    paidAt: new Date(),
  });

  const result = await fulfillOrder(order._id.toString());
  console.log("\nE-mail result:", result, result === "logged" ? "(RESEND_API_KEY not set - printed above)" : "");
  console.log("Download page:", downloadPageUrl(order._id.toString()));
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
