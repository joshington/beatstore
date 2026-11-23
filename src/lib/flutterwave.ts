import { createHmac, timingSafeEqual } from "crypto";
import { connectDB } from "./mongodb";
import { Order } from "@/models/Order";
import { fulfillOrder } from "./fulfillment";

const API = "https://api.flutterwave.com/v3";

export const FLW_CURRENCY = process.env.FLW_CURRENCY ?? "USD";

function secretKey(): string {
  const key = process.env.FLW_SECRET_KEY;
  if (!key) throw new Error("FLW_SECRET_KEY is not set.");
  return key;
}

interface InitResponse {
  status: string;
  message: string;
  data?: { link?: string };
}

interface VerifyResponse {
  status: string;
  message?: string;
  data?: {
    id: number;
    tx_ref: string;
    status: string; // "successful" | "failed" | "pending"
    amount: number;
    currency: string;
  };
}

export async function initPayment(params: {
  txRef: string;
  amount: number;
  currency: string;
  redirectUrl: string;
  email: string;
  title: string;
  orderId: string;
}): Promise<string> {
  const res = await fetch(`${API}/payments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      tx_ref: params.txRef,
      amount: params.amount,
      currency: params.currency,
      redirect_url: params.redirectUrl,
      customer: { email: params.email },
      meta: { order_id: params.orderId },
      customizations: { title: params.title },
    }),
  });
  const body = (await res.json().catch(() => null)) as InitResponse | null;
  if (!res.ok || body?.status !== "success" || !body.data?.link) {
    throw new Error(`Flutterwave init failed: ${body?.message ?? res.status}`);
  }
  return body.data.link;
}

export async function verifyTransaction(transactionId: string | number): Promise<VerifyResponse> {
  const res = await fetch(`${API}/transactions/${encodeURIComponent(String(transactionId))}/verify`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
    cache: "no-store",
  });
  return (await res.json().catch(() => ({ status: "error" }))) as VerifyResponse;
}

export type SettleResult =
  | { state: "paid"; orderId: string }
  | { state: "pending" | "failed" | "not_found" };

/**
 * Confirms a payment with Flutterwave and marks the order paid.
 * Never trusts redirect query params or webhook bodies on their own: the transaction is
 * re-fetched from Flutterwave and its reference, currency and amount are checked against the order.
 * Safe to call repeatedly (redirect and webhook may both fire).
 */
export async function settleOrder(txRef: string, transactionId: string | number): Promise<SettleResult> {
  await connectDB();
  const order = await Order.findOne({ txRef });
  if (!order) return { state: "not_found" };
  if (order.status === "paid") return { state: "paid", orderId: order._id.toString() };

  const v = await verifyTransaction(transactionId);
  const d = v.data;
  if (v.status !== "success" || !d) return { state: "failed" };
  if (d.status === "pending") return { state: "pending" };

  const matches =
    d.status === "successful" &&
    d.tx_ref === txRef &&
    d.currency === order.currency &&
    Number(d.amount) + 0.001 >= order.totalCents / 100;

  if (!matches) {
    if (d.status === "failed") await Order.updateOne({ _id: order._id, status: "pending" }, { status: "failed" });
    return { state: "failed" };
  }

  // Atomically flip to paid. Only the request that actually makes the change (the redirect or the
  // webhook, whichever arrives first) sends the delivery e-mail, so customers never get duplicates.
  const previous = await Order.findOneAndUpdate(
    { _id: order._id, status: { $ne: "paid" } },
    { status: "paid", flwTransactionId: String(d.id), paidAt: new Date() },
    { new: false }
  );
  if (previous) {
    try {
      await fulfillOrder(order._id.toString());
    } catch (err) {
      console.error("Order fulfilment failed:", err);
    }
  }
  return { state: "paid", orderId: order._id.toString() };
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Webhook authenticity check. Flutterwave has used a plain `verif-hash` header carrying the secret hash
 * you set in the dashboard, and a newer `flutterwave-signature` header (base64 HMAC-SHA256 of the raw body).
 * Both are accepted. The webhook handler also re-verifies the transaction through the API, so a forged
 * request cannot mark an order paid.
 */
export function validWebhookSignature(rawBody: string, headers: Headers): boolean {
  const secretHash = process.env.FLW_SECRET_HASH;
  if (!secretHash) return false;
  const legacy = headers.get("verif-hash");
  if (legacy && safeEqual(legacy, secretHash)) return true;
  const sig = headers.get("flutterwave-signature");
  if (sig) {
    const expected = createHmac("sha256", secretHash).update(rawBody).digest("base64");
    return safeEqual(sig, expected);
  }
  return false;
}
