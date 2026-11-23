import assert from "node:assert/strict";

process.env.DOWNLOAD_SECRET = "unit-test-secret-0123456789";
process.env.DOWNLOAD_LINK_DAYS = "14";

import {
  makeOrderToken,
  verifyOrderToken,
  isExpired,
  expiresAt,
  isFileKind,
  sanitizeDeliver,
  downloadFilename,
} from "../src/lib/downloads";
import { computeTotals } from "../src/lib/pricing";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log("  ok  ", name);
  } catch (e) {
    console.error("  FAIL", name);
    throw e;
  }
}

const id = "65f1a2b3c4d5e6f708192a3b";

test("token round-trips", () => {
  assert.equal(verifyOrderToken(makeOrderToken(id)), id);
});
test("tampered signature is rejected", () => {
  const t = makeOrderToken(id);
  assert.equal(verifyOrderToken(t.slice(0, -2) + (t.endsWith("aa") ? "bb" : "aa")), null);
});
test("token for a different order id is rejected", () => {
  const sig = makeOrderToken(id).split(".")[1];
  assert.equal(verifyOrderToken(`65f1a2b3c4d5e6f708192a3c.${sig}`), null);
});
test("garbage tokens are rejected", () => {
  for (const bad of ["", ".", "abc", `${id}.`, `${id}`, "../etc/passwd.x", `${id}.${"A".repeat(500)}`]) {
    assert.equal(verifyOrderToken(bad), null, `should reject "${bad}"`);
  }
});
test("token made with another secret is rejected", () => {
  const t = makeOrderToken(id);
  process.env.DOWNLOAD_SECRET = "a-completely-different-secret-xyz";
  assert.equal(verifyOrderToken(t), null);
  process.env.DOWNLOAD_SECRET = "unit-test-secret-0123456789";
});
test("missing or short secret throws instead of signing", () => {
  const old = process.env.DOWNLOAD_SECRET;
  process.env.DOWNLOAD_SECRET = "short";
  assert.throws(() => makeOrderToken(id));
  process.env.DOWNLOAD_SECRET = old;
});
test("expiry: fresh link ok, 15-day-old link expired, missing paidAt expired", () => {
  const now = new Date();
  assert.equal(isExpired(now), false);
  assert.equal(isExpired(new Date(now.getTime() - 13 * 86_400_000)), false);
  assert.equal(isExpired(new Date(now.getTime() - 15 * 86_400_000)), true);
  assert.equal(isExpired(undefined), true);
  assert.equal(expiresAt(new Date(0)).getTime(), 14 * 86_400_000);
});
test("file kinds are validated", () => {
  assert.equal(isFileKind("wav"), true);
  assert.equal(isFileKind("toString"), false);
  assert.equal(isFileKind("../x"), false);
  assert.deepEqual(sanitizeDeliver(["mp3", "bogus", "stems"]), ["mp3", "stems"]);
  assert.deepEqual(sanitizeDeliver(undefined), []);
});
test("download filenames are safe", () => {
  assert.equal(downloadFilename("sunrise-afrobeat-type-beat", "wav", "tracks/x/y.wav"), "sunrise-afrobeat-type-beat-wav.wav");
  assert.equal(downloadFilename('a"b/../c', "mp3", "k.mp3"), "a_b_.._c-mp3.mp3");
});
test("bulk deal: every 3rd (cheapest) track is free", () => {
  const t = (p: number) => ({ kind: "track" as const, priceCents: p });
  assert.equal(computeTotals([t(3000), t(3000)]).totalCents, 6000);
  assert.equal(computeTotals([t(3000), t(5500), t(12500)]).totalCents, 18000);
  assert.equal(computeTotals([t(3000), t(3000), t(3000), t(3000), t(3000), t(3000)]).totalCents, 12000);
  assert.equal(computeTotals([{ kind: "soundkit" as const, priceCents: 1000 }, t(3000), t(3000)]).totalCents, 7000);
});

async function atest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log("  ok  ", name);
  } catch (e) {
    console.error("  FAIL", name);
    throw e;
  }
}

async function main() {
  const { mkdtemp, writeFile, mkdir } = await import("fs/promises");
  const os = await import("os");
  const path = await import("path");
  const dir = await mkdtemp(path.join(os.tmpdir(), "beatstore-test-"));
  process.env.STORAGE_DRIVER = "local";
  process.env.STORAGE_LOCAL_DIR = dir;
  await mkdir(path.join(dir, "tracks"), { recursive: true });
  await writeFile(path.join(dir, "tracks", "a.wav"), "hello-audio");
  await writeFile(path.join(path.dirname(dir), "secret-outside.txt"), "nope");

  const { deliverFile, fileAvailable, saveFile, servePublicFile } = await import("../src/lib/storage");

  await atest("local storage streams an existing file as an attachment", async () => {
    assert.equal(await fileAvailable("tracks/a.wav"), true);
    const res = await deliverFile("tracks/a.wav", "my-beat-wav.wav");
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-disposition"), 'attachment; filename="my-beat-wav.wav"');
    assert.equal(res.headers.get("cache-control"), "private, no-store");
    assert.equal(await res.text(), "hello-audio");
  });
  await atest("missing files are reported unavailable / 404", async () => {
    assert.equal(await fileAvailable("tracks/missing.wav"), false);
    assert.equal((await deliverFile("tracks/missing.wav", "x.wav")).status, 404);
  });
  await atest("uploaded previews support byte-range playback", async () => {
    await saveFile("tracks/uploaded/preview.mp3", Buffer.from("preview-audio"), "audio/mpeg");
    const res = await servePublicFile("tracks/uploaded/preview.mp3", "bytes=8-12");
    assert.equal(res.status, 206);
    assert.equal(res.headers.get("content-type"), "audio/mpeg");
    assert.equal(res.headers.get("content-range"), "bytes 8-12/13");
    assert.equal(await res.text(), "audio");
  });
  await atest("invalid preview ranges return 416", async () => {
    const res = await servePublicFile("tracks/a.wav", "bytes=999-");
    assert.equal(res.status, 416);
    assert.equal(res.headers.get("content-range"), "bytes */11");
  });
  await atest("path traversal outside the storage folder is blocked", async () => {
    for (const evil of ["../secret-outside.txt", "tracks/../../secret-outside.txt", "/etc/passwd"]) {
      assert.equal(await fileAvailable(evil), false, evil);
      assert.equal((await deliverFile(evil, "x")).status, 404, evil);
    }
  });

  await atest("delivery e-mail goes to Resend with the right link and escaped titles", async () => {
    process.env.RESEND_API_KEY = "re_test_123";
    process.env.EMAIL_FROM = "Shop <orders@example.com>";
    process.env.NEXT_PUBLIC_SITE_URL = "https://shop.example.com/";
    const realFetch = globalThis.fetch;
    let captured: { url: string; init: RequestInit } | null = null;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      captured = { url, init };
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    try {
      const { sendOrderLinks } = await import("../src/lib/fulfillment");
      const result = await sendOrderLinks("buyer@example.com", [{ id, titles: ["<b>Evil</b> beat (MP3 Lease)"] }]);
      assert.equal(result, "sent");
      assert.ok(captured);
      const c = captured as { url: string; init: RequestInit };
      assert.equal(c.url, "https://api.resend.com/emails");
      assert.equal((c.init.headers as Record<string, string>).Authorization, "Bearer re_test_123");
      const body = JSON.parse(c.init.body as string);
      assert.deepEqual(body.to, ["buyer@example.com"]);
      assert.equal(body.from, "Shop <orders@example.com>");
      const link = `https://shop.example.com/downloads/${makeOrderToken(id)}`;
      assert.ok(body.html.includes(link) && body.text.includes(link), "link present in html and text");
      assert.ok(!body.html.includes("<b>Evil</b>"), "title must be HTML-escaped");
      assert.ok(body.html.includes("&lt;b&gt;Evil&lt;/b&gt;"));
      assert.equal(verifyOrderToken(link.split("/downloads/")[1]), id);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
  await atest("a Resend failure is reported as failed, not thrown", async () => {
    const realFetch = globalThis.fetch;
    const realErr = console.error;
    console.error = () => {};
    globalThis.fetch = (async () => new Response("bad", { status: 422 })) as typeof fetch;
    try {
      const { sendEmail } = await import("../src/lib/email");
      assert.equal(await sendEmail({ to: "a@b.co", subject: "s", html: "h", text: "t" }), "failed");
    } finally {
      globalThis.fetch = realFetch;
      console.error = realErr;
    }
  });
  await atest("without RESEND_API_KEY the e-mail is logged, not sent", async () => {
    delete process.env.RESEND_API_KEY;
    const realLog = console.log;
    console.log = () => {};
    try {
      const { sendEmail } = await import("../src/lib/email");
      assert.equal(await sendEmail({ to: "a@b.co", subject: "s", html: "h", text: "t" }), "logged");
    } finally {
      console.log = realLog;
    }
  });

  console.log(`\n${passed} tests passed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
