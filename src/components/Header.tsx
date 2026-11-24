"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "./CartContext";
import { money } from "@/lib/format";
import { LOGO, SITE_NAME, WORDMARK } from "@/lib/brand";

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
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the phone menu when you go to another page, and when you press Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <button
          type="button"
          className="menu-btn"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="menu-icon" aria-hidden="true"><i /><i /><i /></span>
        </button>

        <Link href="/" className="brand" aria-label={`${SITE_NAME} home`}>
          <img src={LOGO.mark.src} width={LOGO.mark.width} height={LOGO.mark.height} alt="" />
          <span className="brand-text" aria-hidden="true">
            <b>{WORDMARK.first}</b>
            <i>{WORDMARK.second}</i>
          </span>
        </Link>

        <nav className="nav" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href}>{l.label}</Link>
          ))}
        </nav>

        <form action="/music/tracks" method="get" className="search" role="search">
          <input name="q" placeholder="Search beats" aria-label="Search beats" />
        </form>

        <Link href="/cart" className="cart-link" aria-label={`Cart: ${items.length} item${items.length === 1 ? "" : "s"}, ${money(totalCents)}`}>
          <span className="badge">{items.length}</span>
          <span className="cart-total">{money(totalCents)}</span>
        </Link>
        <Link href="/account" className="account-link">Account</Link>
      </div>

      {open && (
        <div id="mobile-menu" className="mobile-menu">
          <div className="container">
            <form action="/music/tracks" method="get" className="mobile-search" role="search">
              <input name="q" placeholder="Search beats" aria-label="Search beats" />
            </form>
            <nav aria-label="Main (mobile)">
              {links.map((l) => (
                <Link key={l.href} href={l.href}>{l.label}</Link>
              ))}
              <Link href="/account">Account</Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
