import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage({ searchParams }: { searchParams: { subject?: string } }) {
  return (
    <div className="container page">
      <h1>Contact</h1>
      <ContactForm defaultSubject={searchParams.subject ?? ""} />
    </div>
  );
}
