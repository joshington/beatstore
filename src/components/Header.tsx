"use client";

import Link from "next/link";
import { useCart } from "./CartContext";
import { money } from "@/lib/format";

const SITE = process.env.NEXT_PUBLIC_SITE_NAME ?? "YOUR BEATS";

const links = [
  { href: "/music/tracks", label: "Tracks" },
  { href: "/sound-kits", label: "Sound Kits" },
  { href: "/services", label: "Services" },
  { href: "/licensing-info", label: "Licensing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const { items, totalCents } = useCart();
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand">
          {SITE}
        </Link>
        <nav className="nav">
          {links.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>
        <form action="/music/tracks" method="get" className="search">
          <input name="q" placeholder="Search beats" aria-label="Search beats" />
        </form>
        <Link href="/cart" className="cart-link">
          <span className="badge">{items.length}</span> {money(totalCents)}
        </Link>
        <Link href="/account" className="account-link">Account</Link>
      </div>
    </header>
  );
}
