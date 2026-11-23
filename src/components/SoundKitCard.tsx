"use client";

import { useCart } from "./CartContext";
import { money } from "@/lib/format";
import type { SoundKitDTO } from "@/lib/types";

export default function SoundKitCard({ kit }: { kit: SoundKitDTO }) {
  const cart = useCart();
  const inCart = cart.has("soundkit", kit.slug);
  return (
    <div className="card">
      <img src={kit.artworkUrl} alt={kit.title} />
      <h3>{kit.title}</h3>
      <p>{kit.description}</p>
      <button
        className={`btn small${inCart ? " in" : ""}`}
        onClick={() =>
          cart.add({ kind: "soundkit", slug: kit.slug, title: kit.title, artworkUrl: kit.artworkUrl, priceCents: kit.priceCents })
        }
      >
        {money(kit.priceCents)} {inCart ? "IN CART" : "ADD"}
      </button>
    </div>
  );
}
