"use client";

import { FormEvent, useState } from "react";

export default function ContactForm({ defaultSubject = "" }: { defaultSubject?: string }) {
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [status, setStatus] = useState<"idle" | "busy" | "ok" | "error">("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = new FormData(form);
    setStatus("busy");
    setErrors({});
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: d.get("name"),
        email: d.get("email"),
        subject: d.get("subject"),
        message: d.get("message"),
      }),
    });
    if (res.ok) {
      setStatus("ok");
      form.reset();
    } else {
      const body = await res.json().catch(() => ({}));
      setErrors(body.errors ?? {});
      setStatus("error");
    }
  }

  const field = (name: string) => errors[name]?.[0] && <small className="err">{errors[name][0]}</small>;

  return (
    <form onSubmit={onSubmit} className="form">
      <label>YOUR NAME<input name="name" />{field("name")}</label>
      <label>E-MAIL ADDRESS<input name="email" type="email" />{field("email")}</label>
      <label>SUBJECT<input name="subject" defaultValue={defaultSubject} />{field("subject")}</label>
      <label>MESSAGE<textarea name="message" rows={5} />{field("message")}</label>
      <button className="btn" disabled={status === "busy"}>SEND MESSAGE</button>
      {status === "ok" && <p className="ok">Message sent. Thank you!</p>}
    </form>
  );
}
