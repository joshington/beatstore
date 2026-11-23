import { createHmac, timingSafeEqual } from "crypto";

export type FileKind = "mp3" | "wav" | "stems" | "kit";

export const FILE_LABELS: Record<FileKind, string> = {
  mp3: "MP3",
  wav: "WAV",
  stems: "Stems (ZIP)",
  kit: "Sound kit (ZIP)",
};

export function isFileKind(value: string): value is FileKind {
  return Object.prototype.hasOwnProperty.call(FILE_LABELS, value);
}

function envNumber(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** How long after payment the download links keep working. */
export const linkDays = () => envNumber("DOWNLOAD_LINK_DAYS", 14);
/** Maximum downloads per purchased item (all file types together). */
export const maxDownloadsPerItem = () => envNumber("DOWNLOAD_MAX_PER_ITEM", 10);

function secret(): string {
  const s = process.env.DOWNLOAD_SECRET;
  if (!s || s.length < 16) {
    throw new Error("DOWNLOAD_SECRET must be set to a random string of at least 16 characters.");
  }
  return s;
}

function sign(orderId: string): string {
  return createHmac("sha256", secret()).update(orderId).digest("base64url");
}

/**
 * Stateless, tamper-proof token for an order: "<orderId>.<hmac>".
 * Can be regenerated at any time (confirmation page, email, "lost link" flow) without storing it.
 */
export function makeOrderToken(orderId: string): string {
  return `${orderId}.${sign(orderId)}`;
}

/** Returns the order id if the token is genuine, otherwise null. */
export function verifyOrderToken(token: string): string | null {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const id = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(id));
  return a.length === b.length && timingSafeEqual(a, b) ? id : null;
}

export function expiresAt(paidAt: Date): Date {
  return new Date(paidAt.getTime() + linkDays() * 86_400_000);
}

export function isExpired(paidAt: Date | null | undefined, now: Date = new Date()): boolean {
  return !paidAt || now.getTime() > expiresAt(paidAt).getTime();
}

export function downloadFilename(slug: string, kind: FileKind, key: string): string {
  const dot = key.lastIndexOf(".");
  const ext = dot >= 0 ? key.slice(dot) : "";
  return `${slug}-${kind}${ext}`.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/** Which kinds of file a license grants, filtered to the ones we know how to deliver. */
export function sanitizeDeliver(deliver: readonly string[] | undefined): FileKind[] {
  return (deliver ?? []).filter(isFileKind);
}
