import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { Message } from "@/models/Message";

const schema = z.object({
  name: z.string().trim().min(1, "Your name is required.").max(100),
  email: z.string().trim().min(3).max(100).email("Enter a valid e-mail address."),
  subject: z.string().trim().min(1, "Subject is required.").max(150),
  message: z.string().trim().min(1, "Message is required.").max(5000),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  await connectDB();
  await Message.create(parsed.data);
  return NextResponse.json({ ok: true }, { status: 201 });
}
