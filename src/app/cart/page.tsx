"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { closePaymentModal, useFlutterwave } from "flutterwave-react-v3";
import { useCart } from "@/components/CartContext";
import { money } from "@/lib/format";
import { storeCurrency } from "@/lib/currency";

interface PaymentDetails {
  id: string;
  txRef: string;
  amount: number;
  currency: string;
  email: string;
  publicKey: string;
}

export default function CartPage() {
  const cart = useCart();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "free" | "error">("idle");
  const [error, setError] = useState("");
  const [downloadPath, setDownloadPath] = useState("");
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [account, setAccount] = useState<{ email: string; role: string } | null>(null);
  const [checkingAccount, setCheckingAccount] = useState(true);

  const handleFlutterPayment = useFlutterwave({
    public_key: payment?.publicKey ?? "",
    tx_ref: payment?.txRef ?? "",
    amount: payment?.amount ?? 0,
    currency: payment?.currency ?? storeCurrency(),
    payment_options: "card,mobilemoney,ussd",
    customer: {
      email: payment?.email ?? "",
      phone_number: "",
      name: payment?.email ?? "",
    },
    meta: payment ? { order_id: payment.id } : undefined,
    customizations: {
      title: process.env.NEXT_PUBLIC_SITE_NAME ?? "Beat Store",
      description: "Purchase beats and sound kits",
      logo: "",
    },
  });

  useEffect(() => {
    fetch("/api/auth")
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data) => {
        setAccount(data);
        if (data?.email) setEmail(data.email);
      })
      .catch(() => setAccount(null))
      .finally(() => setCheckingAccount(false));
  }, []);

  async function checkout(e: FormEvent) {
    e.preventDefault();
    if (payment) {
      if (!payment.publicKey) {
        setError("Payments are not configured. Please contact the store.");
        return;
      }
      handleFlutterPayment({
        callback: (response) => {
          closePaymentModal();
          const query = new URLSearchParams({
            status: response.status,
            tx_ref: String(response.tx_ref),
            transaction_id: String(response.transaction_id),
          });
          window.location.assign(`/checkout/complete?${query.toString()}`);
        },
        onClose: () => {},
      });
      return;
    }

    setStatus("busy");
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.items.map((i) => ({ kind: i.kind, slug: i.slug, licenseSlug: i.licenseSlug })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.free) {
        cart.clear();
        setDownloadPath(body.downloadPath ?? "");
        setStatus("free");
        return;
      }
      if (
        res.ok &&
        typeof body.id === "string" &&
        typeof body.txRef === "string" &&
        typeof body.amount === "number" &&
        typeof body.currency === "string" &&
        typeof body.email === "string" &&
        typeof body.publicKey === "string"
      ) {
        setPayment(body);
        setStatus("idle");
        return;
      }
      setError(body.error ?? "Could not start checkout. Please try again.");
      setStatus("error");
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "free") {
    return (
      <div className="container page">
        <h1>Order confirmed</h1>
        <p>We&apos;ve e-mailed your download link to {email}.</p>
        {downloadPath && (
          <p>
            <a className="btn" href={downloadPath}>Download your files</a>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="container page">
      <h1>Your cart</h1>
      {cart.items.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          <ul className="cart-items">
            {cart.items.map((i) => (
              <li key={i.key}>
                <img src={i.artworkUrl} alt="" width={56} height={56} />
                <div>
                  <strong>{i.title}</strong>
                  <small>{i.licenseName}</small>
                </div>
                <span>{money(i.priceCents)}</span>
                <button className="link" onClick={() => cart.remove(i.key)}>Remove</button>
              </li>
            ))}
          </ul>
          <div className="totals">
            <p>Subtotal: {money(cart.subtotalCents)}</p>
            {cart.discountCents > 0 && <p className="ok">Bulk discount: -{money(cart.discountCents)}</p>}
            <p><strong>Total: {money(cart.totalCents)}</strong></p>
          </div>
          {checkingAccount ? (
            <p className="muted">Checking your account…</p>
          ) : account ? (
            <form onSubmit={checkout} className="form">
              <p className="muted">Signed in as {account.email}. Order updates and download links will be sent to this address.</p>
              <button className="btn" disabled={status === "busy"}>
                {status === "busy" ? "PREPARING CHECKOUT…" : payment ? "PAY WITH FLUTTERWAVE" : "CONTINUE TO CHECKOUT"}
              </button>
              {payment && <p className="muted">Checkout total: {money(cart.totalCents)} {payment.currency}. Select the button to open Flutterwave&apos;s secure payment window.</p>}
              {error && <p className="err">{error}</p>}
            </form>
          ) : (
            <div className="form">
              <p>Sign in or create an account before purchasing. Your download links will be sent to your account e-mail.</p>
              <Link className="btn" href="/account?next=%2Fcart">SIGN IN TO CHECK OUT</Link>
              {error && <p className="err">{error}</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
