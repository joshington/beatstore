"use client";

import { FormEvent, useState } from "react";

export default function LostLinkForm() {
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get("email");
    setStatus("busy");
    const res = await fetch("/api/downloads/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setStatus(res.ok ? "done" : "error");
  }

  if (status === "done") {
    return (
      <p className="ok">
        If that e-mail has a recent purchase, we&apos;ve sent the download links to it. Check your spam folder too.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="form">
      <label>
        E-MAIL USED AT CHECKOUT
        <input name="email" type="email" required />
      </label>
      <button className="btn" disabled={status === "busy"}>SEND MY LINKS</button>
      {status === "error" && <p className="err">Please enter a valid e-mail address.</p>}
    </form>
  );
}
