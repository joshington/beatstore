import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { License } from "@/models/License";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectDB();
  const items = await License.find().sort({ sortOrder: 1 }).lean();
  return NextResponse.json({ items });
}
