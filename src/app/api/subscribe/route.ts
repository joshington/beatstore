import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { Subscriber } from "@/models/Message";

const schema = z.object({
  name: z.string().trim().max(100).optional().default(""),
  email: z.string().trim().email("Enter a valid e-mail address."),
  consent: z.literal(true, { errorMap: () => ({ message: "Please confirm you want emails." }) }),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  await connectDB();
  await Subscriber.updateOne(
    { email: parsed.data.email.toLowerCase() },
    { $setOnInsert: { name: parsed.data.name } },
    { upsert: true }
  );
  return NextResponse.json({ ok: true }, { status: 201 });
}
