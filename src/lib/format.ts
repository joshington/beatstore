import { currencyFractionDigits, minorToMajor, storeCurrency } from "./currency";

export function money(cents: number, currency = storeCurrency()): string {
  const fractionDigits = currencyFractionDigits(currency);
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(minorToMajor(cents, currency));
}

export function duration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Generates a deterministic gradient artwork as a data URI so no external assets are needed. */
export function placeholderArt(seed: string, label = ""): string {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const a = h % 360;
  const b = (a + 50 + (h % 80)) % 360;
  const text = label.slice(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${a},70%,45%)"/><stop offset="1" stop-color="hsl(${b},70%,25%)"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/><text x="50%" y="54%" font-family="Arial,sans-serif" font-size="120" font-weight="700" fill="rgba(255,255,255,.85)" text-anchor="middle">${text}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
