# Beat Store

A beat-store storefront built with Next.js 14 (App Router), TypeScript and MongoDB (Mongoose), with Flutterwave payments and e-mailed download links.

## Features

- Home page with featured track, latest tracks, licensing cards, sound kits, services and contact form
- Track catalogue with text search, genre filter and pagination
- Track detail page with a license picker (MP3 lease, WAV, Unlimited, Stems, Exclusive "make an offer")
- Sticky audio player (queue, play/pause, next/prev, seek) and play counter
- Account sign-up/sign-in required before checkout
- Admin dashboard for beat uploads, license pricing, revenue, customer and play stats
- Cart persisted in localStorage with a bulk deal (every 3 tracks, the cheapest is free)
- Flutterwave Standard checkout, server-side verification and a webhook backup
- After payment: download page + e-mailed link, expiring and download-capped, files kept private
- "Lost my link" page that re-sends links to the buyer's e-mail

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values (see below)
npm run seed                 # sample tracks, licenses, kits, services
npm run seed:files           # tiny placeholder files so downloads can be tested
npm run dev
```

Open http://localhost:3000.

## Settings (.env.local)

| Variable | What it is |
| --- | --- |
| `MONGODB_URI` | Atlas or local connection string. Put the database name before the `?`, e.g. `.../beatstore?appName=...` |
| `NEXT_PUBLIC_SITE_URL` | Public URL of the site. Used in e-mail links and the Flutterwave return URL |
| `SESSION_SECRET` | Required: random secret (at least 32 characters) used to sign account sessions. Generate with `openssl rand -hex 32` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Set both to enable the administrator sign-in at `/admin` |
| `FLW_PUBLIC_KEY`, `FLW_SECRET_KEY`, `FLW_SECRET_HASH` | Flutterwave API keys and webhook hash (see below) |
| `FLW_CURRENCY`, `NEXT_PUBLIC_CURRENCY` | Store/payment currency; set both to the same code (default `UGX`) |
| `DOWNLOAD_SECRET` | Long random string that signs download links. Generate: `openssl rand -hex 32`. **Required.** Changing it invalidates all issued links |
| `DOWNLOAD_LINK_DAYS` | How long links work after payment (default 14) |
| `DOWNLOAD_MAX_PER_ITEM` | Download cap per purchased item (default 10) |
| `RESEND_API_KEY`, `EMAIL_FROM` | E-mail via Resend. Without a key, e-mails are printed to the server console |
| `STORAGE_DRIVER` | `local` (folder, for development) or `s3` (S3 / Cloudflare R2 / any S3-compatible bucket) |
| `S3_*` | Bucket details when `STORAGE_DRIVER=s3` |

## Flutterwave setup

1. In the Flutterwave dashboard, use **Test mode** and copy your public and secret keys (Settings > API Keys) into `FLW_PUBLIC_KEY` and `FLW_SECRET_KEY`.
2. Under Settings > Webhooks, set the URL to `https://YOUR-DOMAIN/api/webhooks/flutterwave` and a **secret hash**; put the same value in `FLW_SECRET_HASH`.
3. Set `NEXT_PUBLIC_SITE_URL`, and set both `FLW_CURRENCY` and `NEXT_PUBLIC_CURRENCY` to the same code. The default is `UGX`; make sure that currency is enabled on your Flutterwave account.

Checkout: `POST /api/orders` re-prices the cart from MongoDB and creates a pending order. The Flutterwave React SDK opens the payment modal using the server-calculated amount. The completion page and webhook verify transactions server-side against Flutterwave and only mark an order `paid` if status, reference, currency and amount match. Webhooks can't reach your machine in development; use a tunnel (ngrok, cloudflared) to test them locally.

Customers create an account or sign in at `/account` before checkout. The order API independently checks the signed-in session and uses that account's e-mail for receipts and delivery. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` to enable administrator sign-in; use `/admin` to upload beats and preview/deliverable files, change shared license prices, and view paid revenue, customer counts and play statistics. Uploads use the configured local or S3 storage driver.

Prices are stored as the currency's minor units. UGX has no fractional unit, so dashboard prices should be entered as whole UGX amounts. Existing catalog values are not automatically converted when changing from USD; review and update license, sound-kit and service prices before accepting UGX payments. Historical revenue is shown separately by currency.

## Delivery of purchased files

When an order becomes `paid` (exactly once, whether the redirect or the webhook gets there first) the buyer is e-mailed a link to `/downloads/<token>`.

- **Private files.** Each track stores storage *keys* (`files.mp3`, `files.wav`, `files.stems`), never public URLs. Sound kits use `fileKey`. The public `audioUrl` is only the tagged preview for the player.
- **What each license includes** is set by `deliver` on the license (e.g. `["mp3","wav","stems"]`) and copied onto the order when it is placed, so later changes don't alter past purchases.
- **Links** are signed (HMAC) with `DOWNLOAD_SECRET`, so they can't be guessed or forged. They expire after `DOWNLOAD_LINK_DAYS` and each item can be downloaded `DOWNLOAD_MAX_PER_ITEM` times.
- **Downloads** go through `/api/download/...`, which checks token, paid status, expiry, entitlement and cap before serving. With `s3`, the buyer is redirected to a 2-minute presigned URL; with `local`, the file is streamed.
- **E-mail trouble never loses a sale.** The confirmation page shows the link too, and `/downloads/lost` re-sends links (always answers the same, so it can't reveal who has bought; 60-second cooldown per address).

### Setting up real file storage

Cloudflare R2 or S3: create a **private** bucket, create an API token with read and write access, set `STORAGE_DRIVER=s3` and the `S3_*` values (for R2: `S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com`, `S3_REGION=auto`), then upload files at the same keys stored in MongoDB (e.g. `tracks/<slug>/<slug>.wav`).

### Setting up e-mail (Resend)

Create an API key at resend.com and set `RESEND_API_KEY`. Verify your sending domain and set `EMAIL_FROM` to an address on it. Until the domain is verified, Resend only delivers to your own account address.

## Testing the delivery flow

```bash
npm run test:unit                          # automated checks (tokens, expiry, storage, preview ranges, e-mail)
npm run test:delivery -- you@example.com   # creates a paid test order, sends the real e-mail, prints the download URL
```

Open the printed URL and click each download. Also try: a link with one character changed (should say invalid), `/downloads/lost`, and downloading one item more than `DOWNLOAD_MAX_PER_ITEM` times (should refuse).

## Next steps

- Replace the sample license terms with your own contract language
- Put rate limiting in front of the public forms and API routes before launch
