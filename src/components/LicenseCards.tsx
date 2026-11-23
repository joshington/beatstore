import type { LicenseDTO } from "@/lib/types";
import { money } from "@/lib/format";

export default function LicenseCards({ licenses }: { licenses: LicenseDTO[] }) {
  return (
    <div className="grid">
      {licenses.map((l) => (
        <div key={l.slug} className="card">
          {l.popular && <span className="pill">POPULAR</span>}
          <h3>{l.name}</h3>
          <p className="price">{l.exclusive ? "Make an offer" : money(l.priceCents)}</p>
          <ul>
            {[...l.files, ...l.terms].map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      ))}
      <div className="card deal">
        <h3>Bulk deals</h3>
        <ul>
          <li>Buy 2 tracks, get 1 free</li>
          <li>Buy 4 tracks, get 2 free</li>
          <li>Buy 6 tracks, get 3 free</li>
          <li>Buy 8 tracks, get 4 free</li>
        </ul>
      </div>
    </div>
  );
}
