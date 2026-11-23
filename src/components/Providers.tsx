"use client";

import { ReactNode } from "react";
import { CartProvider } from "./CartContext";
import { PlayerProvider } from "./PlayerContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <PlayerProvider>{children}</PlayerProvider>
    </CartProvider>
  );
}
