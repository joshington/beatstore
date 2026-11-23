import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Track } from "@/models/Track";
import { License } from "@/models/License";
import { SoundKit } from "@/models/SoundKit";
import { Order } from "@/models/Order";
import { computeTotals } from "@/lib/pricing";
import { FLW_CURRENCY, initPayment } from "@/lib/flutterwave";
import { makeOrderToken, sanitizeDeliver } from "@/lib/downloads";
import { fulfillOrder } from "@/lib/fulfillment";

const schema = z.object({
  items: z
    .array(
      z.object({
        kind: z.enum(["track", "soundkit"]),
        slug: z.string().min(1),
        licenseSlug: z.string().optional(),
      })
    )
    .min(1)
    .max(50),
});

/**
 * Creates a pending order and a Flutterwave hosted payment link.
 * Prices are always re-read from the database, never trusted from the client.
 * Returns { id, link } for paid carts, or { id, free: true } when the total is zero.
 */
export async function POST(req: Request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in before placing an order." }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }
  await connectDB();

  const lines = [];
  for (const item of parsed.data.items) {
    if (item.kind === "track") {
      const [track, license] = await Promise.all([
        Track.findOne({ slug: item.slug }).lean(),
        License.findOne({ slug: item.licenseSlug ?? "" }).lean(),
      ]);
      if (!track || !license || license.exclusive) {
        return NextResponse.json({ error: `Invalid item: ${item.slug}` }, { status: 400 });
      }
      const deliver = sanitizeDeliver(license.deliver);
      if (deliver.some((kind) => !(track.files as Record<string, string> | undefined)?.[kind])) {
        return NextResponse.json({ error: `A required file for ${track.title} is not available.` }, { status: 400 });
      }
      lines.push({
        kind: "track" as const,
        refId: track.slug,
        title: track.title,
        licenseSlug: license.slug,
        licenseName: license.name,
        priceCents: track.free ? 0 : license.priceCents,
        deliver,
      });
    } else {
      const kit = await SoundKit.findOne({ slug: item.slug }).lean();
      if (!kit) return NextResponse.json({ error: `Invalid item: ${item.slug}` }, { status: 400 });
      lines.push({
        kind: "soundkit" as const,
        refId: kit.slug,
        title: kit.title,
        licenseSlug: "",
        licenseName: "",
        priceCents: kit.priceCents,
        deliver: ["kit"],
      });
    }
  }

  const totals = computeTotals(lines);
  const txRef = `ord_${Date.now()}_${randomBytes(6).toString("hex")}`;
  const order = await Order.create({
    email: session.email,
    items: lines,
    subtotalCents: totals.subtotalCents,
    discountCents: totals.discountCents,
    totalCents: totals.totalCents,
    currency: FLW_CURRENCY,
    txRef,
    status: totals.totalCents === 0 ? "paid" : "pending",
    paidAt: totals.totalCents === 0 ? new Date() : undefined,
  });
  const id = order._id.toString();

  if (totals.totalCents === 0) {
    try {
      await fulfillOrder(id);
    } catch (err) {
      console.error("Order fulfilment failed:", err);
    }
    return NextResponse.json(
      { id, free: true, downloadPath: `/downloads/${makeOrderToken(id)}`, ...totals },
      { status: 201 }
    );
  }

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
    const link = await initPayment({
      txRef,
      amount: totals.totalCents / 100,
      currency: FLW_CURRENCY,
      redirectUrl: `${siteUrl}/checkout/complete`,
      email: session.email,
      title: process.env.NEXT_PUBLIC_SITE_NAME ?? "Beat Store",
      orderId: id,
    });
    return NextResponse.json({ id, link, ...totals }, { status: 201 });
  } catch (err) {
    console.error(err);
    await Order.updateOne({ _id: order._id }, { status: "failed" });
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 502 });
  }
}
