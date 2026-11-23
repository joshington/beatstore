import Link from "next/link";
import type { Metadata } from "next";
import { settleOrder } from "@/lib/flutterwave";
import ClearCart from "@/components/ClearCart";
import { makeOrderToken } from "@/lib/downloads";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Payment" };

export default async function CheckoutComplete({
  searchParams,
}: {
  searchParams: { status?: string; tx_ref?: string; transaction_id?: string };
}) {
  const { status, tx_ref: txRef, transaction_id: transactionId } = searchParams;

  let state: "paid" | "pending" | "failed" | "cancelled" | "unknown" = "unknown";
  let orderId = "";

  if (status === "cancelled") {
    state = "cancelled";
  } else if (txRef && transactionId) {
    const result = await settleOrder(txRef, transactionId);
    if (result.state === "paid") {
      state = "paid";
      orderId = result.orderId;
    } else if (result.state === "pending") {
      state = "pending";
    } else {
      state = "failed";
    }
  }

  return (
    <div className="container page">
      {state === "paid" && (
        <>
          <ClearCart />
          <h1>Payment received</h1>
          <p>
            Thank you! Your order <code>{orderId}</code> is confirmed. We&apos;ve also e-mailed your download
            link to the address you used at checkout (check spam if it doesn&apos;t arrive).
          </p>
          <p>
            <Link className="btn" href={`/downloads/${makeOrderToken(orderId)}`}>Download your files</Link>
          </p>
          <Link href="/music/tracks">Keep browsing</Link>
        </>
      )}
      {state === "pending" && (
        <>
          <h1>Payment pending</h1>
          <p>Your payment is still being processed. Your order will be confirmed automatically once it clears.</p>
        </>
      )}
      {state === "cancelled" && (
        <>
          <h1>Payment cancelled</h1>
          <p>You were not charged. Your cart is still saved.</p>
          <Link className="btn" href="/cart">Back to cart</Link>
        </>
      )}
      {(state === "failed" || state === "unknown") && (
        <>
          <h1>We couldn&apos;t confirm your payment</h1>
          <p>If you were charged, contact us with your transaction details and we will sort it out.</p>
          <Link className="btn" href="/cart">Back to cart</Link>
        </>
      )}
    </div>
  );
}
