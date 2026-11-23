import Link from "next/link";
import SubscribeForm from "./SubscribeForm";

const SITE = process.env.NEXT_PUBLIC_SITE_NAME ?? "YOUR BEATS";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <h4>{SITE}</h4>
          <ul>
            <li><Link href="/">Home</Link></li>
            <li><Link href="/music/tracks">Tracks</Link></li>
            <li><Link href="/sound-kits">Sound Kits</Link></li>
            <li><Link href="/services">Services</Link></li>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4>Legal</h4>
          <ul>
            <li><Link href="/licensing-info">Licensing Info</Link></li>
          </ul>
        </div>
        <SubscribeForm />
      </div>
      <p className="copy">&copy; {new Date().getFullYear()} {SITE}. All rights reserved.</p>
    </footer>
  );
}
