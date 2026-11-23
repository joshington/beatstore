import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { linkDays, makeOrderToken } from "@/lib/downloads";
import { sendEmail, type EmailResult } from "@/lib/email";

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

export function downloadPageUrl(orderId: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/downloads/${makeOrderToken(orderId)}`;
}

export interface OrderLinkInfo {
  id: string;
  titles: string[];
}

/** Sends one e-mail containing a download link for each order given. */
export async function sendOrderLinks(to: string, orders: OrderLinkInfo[]): Promise<EmailResult> {
  const site = process.env.NEXT_PUBLIC_SITE_NAME ?? "Beat Store";
  const days = linkDays();

  const textBlocks = orders.map((o) => `${o.titles.join(", ")}\n${downloadPageUrl(o.id)}`);
  const htmlBlocks = orders.map(
    (o) =>
      `<p style="margin:0 0 4px"><strong>${escapeHtml(o.titles.join(", "))}</strong></p>` +
      `<p style="margin:0 0 18px"><a href="${downloadPageUrl(o.id)}" style="background:#ff7a1a;color:#000;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block">Download your files</a></p>`
  );

  const subject = orders.length > 1 ? `Your ${site} download links` : `Your ${site} order is ready`;
  const text =
    `Thank you for your purchase!\n\n${textBlocks.join("\n\n")}\n\n` +
    `Links work for ${days} days after purchase. Keep them private: anyone with a link can download your files.\n` +
    `Problems? Just reply to this e-mail or contact us on the site.`;
  const html =
    `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#111">` +
    `<h2>Thank you for your purchase!</h2>${htmlBlocks.join("")}` +
    `<p style="color:#555;font-size:13px">Links work for ${days} days after purchase. Keep them private: anyone with a link can download your files.</p>` +
    `<p style="color:#555;font-size:13px">Problems? Just reply to this e-mail or contact us on the site.</p></div>`;

  return sendEmail({ to, subject, html, text });
}

/**
 * Called once when an order becomes paid (from the payment confirmation, the webhook, or a free checkout).
 * E-mail problems never affect the order: the customer can always use the link on the confirmation page
 * or the "lost link" form.
 */
export async function fulfillOrder(orderId: string): Promise<EmailResult | "skipped"> {
  await connectDB();
  const order = await Order.findById(orderId);
  if (!order || order.status !== "paid") return "skipped";

  const result = await sendOrderLinks(order.email, [
    {
      id: order._id.toString(),
      titles: order.items.map((i) => (i.licenseName ? `${i.title} (${i.licenseName})` : i.title)),
    },
  ]);
  if (result === "sent") {
    await Order.updateOne({ _id: order._id }, { emailedAt: new Date() });
  }
  return result;
}
