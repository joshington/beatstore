export interface PricedLine {
  kind: "track" | "soundkit";
  priceCents: number;
}

/**
 * Bulk deal on tracks: for every 3 tracks in the cart, the cheapest one is free
 * (buy 2 get 1 free, buy 4 get 2 free, buy 6 get 3 free, ...).
 */
export function computeTotals(lines: PricedLine[]) {
  const subtotalCents = lines.reduce((sum, l) => sum + l.priceCents, 0);
  const trackPrices = lines
    .filter((l) => l.kind === "track")
    .map((l) => l.priceCents)
    .sort((a, b) => a - b);
  const freeCount = Math.floor(trackPrices.length / 3);
  const discountCents = trackPrices.slice(0, freeCount).reduce((s, p) => s + p, 0);
  return { subtotalCents, discountCents, totalCents: subtotalCents - discountCents, freeCount };
}
