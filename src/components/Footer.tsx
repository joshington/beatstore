import Link from "next/link";
import SubscribeForm from "./SubscribeForm";
import { LOGO, SITE_NAME } from "@/lib/brand";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link href="/" aria-label={`${SITE_NAME} home`}>
            <img
              className="footer-logo"
              src={LOGO.full.src}
              width={LOGO.full.width}
              height={LOGO.full.height}
              alt={SITE_NAME}
              loading="lazy"
            />
          </Link>
          <p className="muted">Beats, sound kits and production services.</p>
        </div>
        <div>
          <h4>Explore</h4>
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
      <p className="copy">&copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</p>
    </footer>
  );
}
