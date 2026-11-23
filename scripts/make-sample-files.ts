import { mkdir, writeFile } from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import { Track } from "../src/models/Track";
import { SoundKit } from "../src/models/SoundKit";

/**
 * Creates tiny PLACEHOLDER files in the local storage folder for every track and sound kit in the database,
 * so you can test downloads end to end. Replace them with your real files (same paths), or upload real
 * files to your bucket when you switch to STORAGE_DRIVER=s3.
 */
const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/beatstore";
const base = path.resolve(process.env.STORAGE_LOCAL_DIR ?? "storage");

/** One second of valid silent 8-bit mono WAV audio. */
function silentWav(): Buffer {
  const sampleRate = 8000;
  const data = Buffer.alloc(sampleRate, 128);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate, 28);
  header.writeUInt16LE(1, 32);
  header.writeUInt16LE(8, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

/** A valid, empty ZIP archive (just the end-of-central-directory record). */
const emptyZip = () => Buffer.from([0x50, 0x4b, 0x05, 0x06, ...new Array(18).fill(0)]);

async function put(key: string, content: Buffer | string) {
  if (!key) return;
  const full = path.resolve(base, key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, content);
  console.log("  wrote", path.relative(process.cwd(), full));
}

async function main() {
  await mongoose.connect(uri);
  for (const t of await Track.find().lean()) {
    await put(t.files?.mp3 ?? "", "PLACEHOLDER MP3 - replace with your real file.\n");
    await put(t.files?.wav ?? "", silentWav());
    await put(t.files?.stems ?? "", emptyZip());
  }
  for (const k of await SoundKit.find().lean()) {
    await put(k.fileKey ?? "", emptyZip());
  }
  await mongoose.disconnect();
  console.log("Done. Files are in", base);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
