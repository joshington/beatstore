import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Track } from "@/models/Track";
import { User } from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET() {
  if (getSession()?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  await connectDB();
  const [revenue, paidOrders, users, tracks, topTracks] = await Promise.all([
    Order.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$totalCents" } } },
    ]),
    Order.countDocuments({ status: "paid" }),
    User.countDocuments(),
    Track.countDocuments(),
    Track.find().sort({ plays: -1 }).limit(5).select("title plays").lean(),
  ]);
  return NextResponse.json({
    revenueCents: revenue[0]?.total ?? 0,
    paidOrders,
    users,
    tracks,
    topTracks: topTracks.map((track) => ({ title: track.title, plays: track.plays ?? 0 })),
  });
}
