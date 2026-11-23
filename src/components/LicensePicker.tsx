"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "./CartContext";
import { money } from "@/lib/format";
import type { TrackDTO, LicenseDTO } from "@/lib/types";

export default function LicensePicker({ track, licenses }: { track: TrackDTO; licenses: LicenseDTO[] }) {
  const cart = useCart();
  const buyable = licenses.filter((l) => !l.exclusive);
  const [selected, setSelected] = useState(buyable[0]?.slug ?? "");

  return (
    <div className="licenses">
      {licenses.map((l) => {
        const price = track.free && !l.exclusive ? 0 : l.priceCents;
        const active = selected === l.slug;
        return (
          <div key={l.slug} className={`license${active ? " active" : ""}`}>
            <div className="license-head">
              <h4>
                {l.name} {l.popular && <span className="pill">POPULAR</span>}
              </h4>
              <strong>{l.exclusive ? "Make an offer" : money(price)}</strong>
            </div>
            <ul>
              {[...l.files, ...l.terms].map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            {l.exclusive ? (
              <Link className="btn small" href={`/contact?subject=${encodeURIComponent(`Exclusive offer: ${track.title}`)}`}>
                MAKE AN OFFER
              </Link>
            ) : (
              <button className="btn small" onClick={() => setSelected(l.slug)}>
                {active ? "SELECTED" : "SELECT"}
              </button>
            )}
          </div>
        );
      })}
      <button
        className="btn"
        onClick={() => {
          const l = buyable.find((b) => b.slug === selected);
          if (!l) return;
          cart.add({
            kind: "track",
            slug: track.slug,
            title: track.title,
            artworkUrl: track.artworkUrl,
            licenseSlug: l.slug,
            licenseName: l.name,
            priceCents: track.free ? 0 : l.priceCents,
          });
        }}
      >
        {cart.has("track", track.slug) ? "UPDATE CART" : "ADD TO CART"}
      </button>
    </div>
  );
}
