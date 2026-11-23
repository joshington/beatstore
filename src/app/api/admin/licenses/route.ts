import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { License } from "@/models/License";

export const dynamic = "force-dynamic";

export async function GET() {
  if (getSession()?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  await connectDB();
  const licenses = await License.find().sort({ sortOrder: 1 }).select("slug name priceCents exclusive deliver").lean();
  return NextResponse.json(licenses);
}

export async function PATCH(req: Request) {
  if (getSession()?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const parsed = z.object({
    prices: z.array(z.object({
      slug: z.string().min(1),
      priceCents: z.number().int().min(0).max(1_000_000_000),
    })).min(1).max(50),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter valid prices." }, { status: 400 });

  await connectDB();
  const slugs = [...new Set(parsed.data.prices.map(({ slug }) => slug))];
  if (await License.countDocuments({ slug: { $in: slugs } }) !== slugs.length) {
    return NextResponse.json({ error: "One or more licenses could not be found." }, { status: 404 });
  }
  await Promise.all(parsed.data.prices.map(({ slug, priceCents }) =>
    License.updateOne({ slug }, { $set: { priceCents } })
  ));
  return NextResponse.json({ ok: true });
}
