import type { Metadata } from "next";
import { getSoundKits } from "@/lib/data";
import SoundKitCard from "@/components/SoundKitCard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sound Kits" };

export default async function SoundKitsPage() {
  const kits = await getSoundKits();
  return (
    <div className="container page">
      <h1>Sound Kits</h1>
      {kits.length ? <div className="grid">{kits.map((k) => <SoundKitCard key={k.slug} kit={k} />)}</div> : <p>No sound kits yet.</p>}
    </div>
  );
}
