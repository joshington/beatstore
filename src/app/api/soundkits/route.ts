import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { SoundKit } from "@/models/SoundKit";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectDB();
  const items = await SoundKit.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ items });
}
