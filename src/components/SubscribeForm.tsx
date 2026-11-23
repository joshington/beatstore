"use client";

import { FormEvent, useState } from "react";

export default function SubscribeForm() {
  const [status, setStatus] = useState<"idle" | "busy" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setStatus("busy");
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        email: data.get("email"),
        consent: data.get("consent") === "on",
      }),
    });
    if (res.ok) {
      setStatus("ok");
      setMsg("Thanks for subscribing!");
      form.reset();
    } else {
      const body = await res.json().catch(() => ({}));
      const first = Object.values((body.errors ?? {}) as Record<string, string[]>).flat()[0];
      setStatus("error");
      setMsg(first ?? "Something went wrong. Try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="subscribe">
      <h3>GET SPECIAL OFFERS</h3>
      <input name="name" placeholder="Full name" />
      <input name="email" type="email" placeholder="E-mail address" required />
      <label className="check">
        <input name="consent" type="checkbox" /> I would like to receive emails
      </label>
      <button className="btn" disabled={status === "busy"}>
        Subscribe now
      </button>
      {msg && <p className={status === "ok" ? "ok" : "err"}>{msg}</p>}
    </form>
  );
}
