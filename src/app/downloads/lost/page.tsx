import type { Metadata } from "next";
import LostLinkForm from "@/components/LostLinkForm";

export const metadata: Metadata = { title: "Get your download links", robots: { index: false } };

export default function LostLinkPage() {
  return (
    <div className="container page">
      <h1>Get your download links</h1>
      <p className="muted">Enter the e-mail you used at checkout and we&apos;ll send your links again.</p>
      <LostLinkForm />
    </div>
  );
}
