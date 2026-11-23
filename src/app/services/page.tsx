import Link from "next/link";
import type { Metadata } from "next";
import { getServices } from "@/lib/data";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage() {
  const services = await getServices();
  return (
    <div className="container page">
      <h1>Services</h1>
      <div className="grid">
        {services.map((s) => (
          <div key={s.slug} className="card">
            <img src={s.imageUrl} alt={s.title} />
            <h3>{s.title}</h3>
            <p>{s.description}</p>
            <p className="muted">Turnaround: {s.turnaround}</p>
            <p className="muted">What we need: {s.needs}</p>
            <p className="price">From {money(s.priceCents)}</p>
            <Link className="btn small" href={`/contact?subject=${encodeURIComponent(s.title)}`}>Request this service</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
