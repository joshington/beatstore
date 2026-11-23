"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { computeTotals } from "@/lib/pricing";

export interface CartItem {
  key: string;
  kind: "track" | "soundkit";
  slug: string;
  title: string;
  artworkUrl: string;
  licenseSlug?: string;
  licenseName?: string;
  priceCents: number;
}

interface CartState {
  items: CartItem[];
  add: (item: Omit<CartItem, "key">) => void;
  remove: (key: string) => void;
  clear: () => void;
  has: (kind: CartItem["kind"], slug: string) => boolean;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
}

const CartContext = createContext<CartState | null>(null);
const STORAGE_KEY = "beatstore-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, loaded]);

  const add = useCallback((item: Omit<CartItem, "key">) => {
    const key = `${item.kind}:${item.slug}`;
    setItems((prev) => [...prev.filter((p) => p.key !== key), { ...item, key }]);
  }, []);
  const remove = useCallback((key: string) => setItems((p) => p.filter((i) => i.key !== key)), []);
  const clear = useCallback(() => setItems([]), []);
  const has = useCallback(
    (kind: CartItem["kind"], slug: string) => items.some((i) => i.key === `${kind}:${slug}`),
    [items]
  );

  const totals = useMemo(() => computeTotals(items), [items]);

  const value: CartState = {
    items,
    add,
    remove,
    clear,
    has,
    subtotalCents: totals.subtotalCents,
    discountCents: totals.discountCents,
    totalCents: totals.totalCents,
  };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
