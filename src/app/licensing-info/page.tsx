import type { Metadata } from "next";
import { getLicenses } from "@/lib/data";
import LicenseCards from "@/components/LicenseCards";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Licensing Info" };

export default async function LicensingPage() {
  const licenses = await getLicenses();
  return (
    <div className="container page">
      <h1>Licensing Info</h1>
      <p className="muted">
        Pick the license that fits your release. These are sample terms &mdash; replace them with your own
        contract language before selling.
      </p>
      <LicenseCards licenses={licenses} />
    </div>
  );
}
