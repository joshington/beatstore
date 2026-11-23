export type EmailResult = "sent" | "logged" | "failed";

/**
 * Sends an e-mail through Resend (https://resend.com). If RESEND_API_KEY is not set (local development),
 * the message is printed to the server console instead and "logged" is returned.
 *
 * EMAIL_FROM must be an address on a domain you have verified in Resend. For quick tests you can use
 * "Your Name <onboarding@resend.dev>", but Resend then only delivers to your own account e-mail.
 */
export async function sendEmail(msg: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`\n[email not sent - RESEND_API_KEY missing]\nTo: ${msg.to}\nSubject: ${msg.subject}\n\n${msg.text}\n`);
    return "logged";
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Beat Store <onboarding@resend.dev>",
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
    });
    if (!res.ok) {
      console.error(`Resend rejected the e-mail (${res.status}):`, await res.text());
      return "failed";
    }
    return "sent";
  } catch (err) {
    console.error("Could not reach Resend:", err);
    return "failed";
  }
}
