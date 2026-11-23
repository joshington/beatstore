import mongoose from "mongoose";
import { Track } from "../src/models/Track";
import { License } from "../src/models/License";
import { SoundKit } from "../src/models/SoundKit";
import { Service } from "../src/models/Service";
import { slugify, placeholderArt } from "../src/lib/format";

const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/beatstore";

const trackSeeds: { title: string; bpm: number; dur: number; genres: string[]; tags: string[]; free?: boolean }[] = [
  { title: "Sunrise", bpm: 112, dur: 161, genres: ["AFROBEAT", "AFROSWING"], tags: ["emotional", "smooth"] },
  { title: "Lagos Nights", bpm: 100, dur: 176, genres: ["AFROBEAT", "AFROSWING"], tags: ["dancehall", "club"] },
  { title: "Free Spirit", bpm: 106, dur: 147, genres: ["AFROBEAT"], tags: ["free", "chill"], free: true },
  { title: "Golden Hour", bpm: 98, dur: 162, genres: ["AFROBEAT", "AFROSWING"], tags: ["rnb", "warm"] },
  { title: "Ayo", bpm: 113, dur: 172, genres: ["AFROBEAT", "AFROSWING"], tags: ["party"] },
  { title: "Tide", bpm: 95, dur: 181, genres: ["AFROBEAT", "AFROSWING"], tags: ["wave", "laid-back"] },
  { title: "Kampala Drive", bpm: 110, dur: 153, genres: ["AFROHOUSE", "AMAPIANO"], tags: ["log drum", "dance"] },
  { title: "Moonlight", bpm: 100, dur: 153, genres: ["AFROBEAT", "AFROSWING"], tags: ["sad", "emotional"] },
  { title: "Ember", bpm: 97, dur: 171, genres: ["AFROBEAT", "AFROSWING"], tags: ["dark"] },
  { title: "Highlife", bpm: 104, dur: 158, genres: ["AFROBEAT"], tags: ["guitar", "bright"] },
  { title: "Savanna", bpm: 112, dur: 175, genres: ["AFROHOUSE", "AMAPIANO"], tags: ["groove"] },
  { title: "Rooftop", bpm: 99, dur: 165, genres: ["AFROBEAT", "AFROSWING"], tags: ["summer"] },
];

async function main() {
  await mongoose.connect(uri);
  console.log("Connected to MongoDB database:", mongoose.connection.name);

  await Promise.all([
    Track.deleteMany({}),
    License.deleteMany({}),
    SoundKit.deleteMany({}),
    Service.deleteMany({}),
  ]);

  const now = Date.now();
  await Track.insertMany(
    trackSeeds.map((t, i) => {
      const slug = slugify(`${t.title}-${t.genres[0]}-type-beat`);
      return {
        slug,
        title: `${t.title.toUpperCase()} - ${t.genres[0].toLowerCase()} type beat`,
        bpm: t.bpm,
        durationSec: t.dur,
        genres: t.genres,
        tags: t.tags,
        artworkUrl: placeholderArt(slug, t.title),
        audioUrl: "",
        files: {
          mp3: `tracks/${slug}/${slug}.mp3`,
          wav: `tracks/${slug}/${slug}.wav`,
          stems: `tracks/${slug}/${slug}-stems.zip`,
        },
        featured: i === 0,
        free: !!t.free,
        publishedAt: new Date(now - i * 86_400_000 * 3),
      };
    })
  );

  const bullets = (files: string[], unlimited: boolean) => ({
    files,
    terms: [
      unlimited ? "Unlimited commercial use." : "Commercial use.",
      "Must credit the producer.",
      "Producer retains full ownership of the instrumental.",
    ],
  });

  await License.insertMany([
    { slug: "mp3-lease", name: "MP3 Lease", priceCents: 3000, popular: true, sortOrder: 1, deliver: ["mp3"], ...bullets(["MP3 (tagged once)"], false) },
    { slug: "basic-wav-lease", name: "Basic WAV Lease", priceCents: 5500, popular: true, sortOrder: 2, deliver: ["mp3", "wav"], ...bullets(["MP3 + WAV (tagged once)"], false) },
    { slug: "unlimited-wav-lease", name: "Unlimited WAV Lease", priceCents: 12500, popular: true, sortOrder: 3, deliver: ["mp3", "wav"], ...bullets(["MP3 + WAV (tagged once)"], true) },
    { slug: "unlimited-stems", name: "Unlimited + Stems", priceCents: 25000, popular: true, sortOrder: 4, deliver: ["mp3", "wav", "stems"], ...bullets(["MP3 + WAV + Trackouts (tagged once)"], true) },
    {
      slug: "exclusive",
      name: "Exclusive License",
      priceCents: 0,
      exclusive: true,
      sortOrder: 5,
      files: [],
      terms: [
        "Used for music recording",
        "Unlimited distribution copies",
        "Unlimited online audio streams",
        "Unlimited music video",
        "For-profit live performances",
        "Radio broadcasting rights",
      ],
    },
  ]);

  await SoundKit.insertMany([
    { slug: "afro-gold", title: "AFRO GOLD", description: "Drum one-shots, percussion loops and melodic loops.", priceCents: 1000, artworkUrl: placeholderArt("afro-gold", "AG"), fileKey: "kits/afro-gold.zip" },
    { slug: "log-drum-essentials", title: "LOG DRUM ESSENTIALS", description: "Amapiano log drums and bass hits.", priceCents: 1500, artworkUrl: placeholderArt("log-drum", "LD"), fileKey: "kits/log-drum-essentials.zip" },
  ]);

  await Service.insertMany([
    { slug: "custom-afrobeat-beat", title: "AFROBEAT CUSTOM BEAT", description: "A beat made for you from your references.", turnaround: "2 - 3 days", needs: "2 reference tracks", priceCents: 15000, imageUrl: placeholderArt("custom", "CB") },
    { slug: "mixing-mastering", title: "Full Song Mixing + Mastering", description: "Radio-ready mix and master of your song.", turnaround: "3 - 7 days", needs: "Beat stems + vocal stems", priceCents: 8000, imageUrl: placeholderArt("mix", "MM") },
  ]);

  console.log("Seeded tracks, licenses, sound kits and services.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
