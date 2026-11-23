import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Providers from "@/components/Providers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Player from "@/components/Player";

const SITE = process.env.NEXT_PUBLIC_SITE_NAME ?? "YOUR BEATS";

export const metadata: Metadata = {
  title: { default: SITE, template: `%s | ${SITE}` },
  description: "Buy and license beats online.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
          <Player />
        </Providers>
      </body>
    </html>
  );
}
