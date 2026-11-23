import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { isExpired } from "@/lib/downloads";
import { sendOrderLinks } from "@/lib/fulfillment";

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

const COOLDOWN_MS = 60_000;

/**
 * "Lost my link" flow. Always answers { ok: true } so the form can't be used to discover which
 * e-mail addresses have bought something. A 60-second cooldown per e-mail stops it being used to spam someone.
 */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid e-mail address." }, { status: 400 });
  }
  const email = parsed.data.email;

  await connectDB();
  const orders = await Order.find({ email, status: "paid" }).sort({ paidAt: -1 }).limit(5);
  const live = orders.filter((o) => !isExpired(o.paidAt));
  const recentlySent = live.some(
    (o) => o.lastLinkEmailAt && Date.now() - o.lastLinkEmailAt.getTime() < COOLDOWN_MS
  );

  if (live.length > 0 && !recentlySent) {
    const result = await sendOrderLinks(
      email,
      live.map((o) => ({
        id: o._id.toString(),
        titles: o.items.map((i) => (i.licenseName ? `${i.title} (${i.licenseName})` : i.title)),
      }))
    );
    if (result !== "failed") {
      await Order.updateMany({ _id: { $in: live.map((o) => o._id) } }, { lastLinkEmailAt: new Date() });
    }
  }
  return NextResponse.json({ ok: true });
}
