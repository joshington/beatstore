import { createHmac, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";

const scrypt = promisify(nodeScrypt);
export const SESSION_COOKIE = "beatstore-session";
const SESSION_DAYS = 7;

export interface Session {
  id: string;
  email: string;
  role: "user" | "admin";
  expiresAt: number;
}

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters to enable account sign-in.");
  }
  return secret;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return safeEqual(derived.toString("hex"), hash);
}

export function verifyAdminPassword(email: string, password: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  return !!adminEmail && !!adminPassword && safeEqual(email, adminEmail) && safeEqual(password, adminPassword);
}

export function createSession(session: Omit<Session, "expiresAt">): string {
  const payload = Buffer.from(
    JSON.stringify({ ...session, expiresAt: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000 })
  ).toString("base64url");
  const signature = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function parseSession(value?: string): Session | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  if (!safeEqual(signature, expected)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
    if (
      typeof session.id !== "string" ||
      typeof session.email !== "string" ||
      (session.role !== "user" && session.role !== "admin") ||
      typeof session.expiresAt !== "number" ||
      session.expiresAt <= Date.now()
    ) return null;
    return session;
  } catch {
    return null;
  }
}

export function getSession(): Session | null {
  return parseSession(cookies().get(SESSION_COOKIE)?.value);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}
