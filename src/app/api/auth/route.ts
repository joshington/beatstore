import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import {
  createSession,
  getSession,
  hashPassword,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyAdminPassword,
  verifyPassword,
} from "@/lib/auth";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("register"),
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(10).max(128),
  }),
  z.object({
    action: z.literal("login"),
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1).max(128),
  }),
]);

export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  return NextResponse.json({ email: session.email, role: session.role });
}

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid e-mail and password (at least 10 characters to register)." }, { status: 400 });
  }
  const { action, email, password } = parsed.data;
  await connectDB();

  if (action === "register") {
    if (email === process.env.ADMIN_EMAIL?.trim().toLowerCase()) {
      return NextResponse.json({ error: "That e-mail address cannot be registered." }, { status: 400 });
    }
    const exists = await User.exists({ email });
    if (exists) return NextResponse.json({ error: "An account with that e-mail already exists." }, { status: 409 });
    const user = await User.create({ email, passwordHash: await hashPassword(password) });
    const token = createSession({ id: user._id.toString(), email, role: "user" });
    const response = NextResponse.json({ email, role: "user" }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  }

  if (verifyAdminPassword(email, password)) {
    const token = createSession({ id: "admin", email, role: "admin" });
    const response = NextResponse.json({ email, role: "admin" });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  }

  const user = await User.findOne({ email }).lean();
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "E-mail or password is incorrect." }, { status: 401 });
  }
  const token = createSession({ id: user._id.toString(), email, role: "user" });
  const response = NextResponse.json({ email, role: "user" });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
