import Link from "next/link";
import type { Metadata } from "next";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import {
  FILE_LABELS,
  expiresAt,
  isExpired,
  maxDownloadsPerItem,
  sanitizeDeliver,
  verifyOrderToken,
} from "@/lib/downloads";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your downloads", robots: { index: false } };

export default async function DownloadsPage({ params }: { params: { token: string } }) {
  const orderId = verifyOrderToken(params.token);
  await connectDB();
  const order = orderId ? await Order.findById(orderId).lean() : null;

  if (!order) {
    return (
      <div className="container page">
        <h1>Link not valid</h1>
        <p>This download link isn&apos;t valid. Check you copied the whole link from your e-mail.</p>
        <Link className="btn" href="/downloads/lost">Send me my links again</Link>
      </div>
    );
  }

  if (order.status !== "paid") {
    return (
      <div className="container page">
        <h1>Payment not confirmed yet</h1>
        <p>Your payment hasn&apos;t been confirmed. If you just paid, wait a minute and refresh this page.</p>
      </div>
    );
  }

  if (isExpired(order.paidAt)) {
    return (
      <div className="container page">
        <h1>This link has expired</h1>
        <p>Download links expire after a set time. We can send you a fresh one.</p>
        <Link className="btn" href="/downloads/lost">Send me a new link</Link>
      </div>
    );
  }

  const max = maxDownloadsPerItem();
  const until = expiresAt(order.paidAt as Date).toDateString();

  return (
    <div className="container page">
      <h1>Your downloads</h1>
      <p className="muted">Links work until {until}. Each item can be downloaded up to {max} times.</p>
      <ul className="cart-items">
        {order.items.map((item, i) => {
          const kinds = sanitizeDeliver(item.deliver);
          const left = Math.max(0, max - (item.downloads ?? 0));
          return (
            <li key={i} style={{ gridTemplateColumns: "1fr auto" }}>
              <div>
                <strong>{item.title}</strong>
                <small>{item.licenseName}</small>
                <small>{left} download{left === 1 ? "" : "s"} left</small>
              </div>
              <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                {kinds.length === 0 && <small>Nothing to download for this item.</small>}
                {kinds.map((kind) => (
                  <a key={kind} className="btn small" href={`/api/download/${params.token}/${i}/${kind}`}>
                    {FILE_LABELS[kind]}
                  </a>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="muted">
        Keep this page&apos;s link private &mdash; anyone with it can download your files. Lost it?{" "}
        <Link href="/downloads/lost">Get your links again</Link>.
      </p>
    </div>
  );
}
