import type { Metadata } from "next";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="container page">
      <h1>About</h1>
      <p>
        Tell visitors who you are, what you make and who you have worked with. Edit{" "}
        <code>src/app/about/page.tsx</code> to replace this text.
      </p>
    </div>
  );
}
