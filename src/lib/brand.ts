/** One place for the brand name. Set NEXT_PUBLIC_SITE_NAME in .env.local to change page titles and e-mails. */
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "Warren Professor";

/** The two-line wordmark shown next to the logo icon in the header. */
export const WORDMARK = { first: "WARREN", second: "Professor" };

/** Logo files in /public (made from brand/logo-original.jpg). */
export const LOGO = {
  mark: { src: "/logo-mark.png", width: 47, height: 40 },
  full: { src: "/logo-full.png", width: 633, height: 631 },
};
