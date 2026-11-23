import { NextResponse } from "next/server";
import { settleOrder, validWebhookSignature } from "@/lib/flutterwave";

export const dynamic = "force-dynamic";

/**
 * Flutterwave webhook (set the URL in Dashboard > Settings > Webhooks:
 * https://YOUR-DOMAIN/api/webhooks/flutterwave). Acts as a backup for customers
 * who pay but never return to the site. The transaction is always re-verified via the API.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!validWebhookSignature(raw, req.headers)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { type?: string; event?: string; data?: { id?: number | string; tx_ref?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  const kind = event.type ?? event.event ?? "";
  if (kind.startsWith("charge") && event.data?.id && event.data.tx_ref) {
    await settleOrder(event.data.tx_ref, event.data.id);
  }
  return NextResponse.json({ ok: true });
}
