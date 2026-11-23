import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Service } from "@/models/Service";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectDB();
  const items = await Service.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ items });
}
