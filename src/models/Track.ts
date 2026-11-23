import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const TrackSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    bpm: { type: Number, default: 0 },
    key: { type: String, default: "" },
    durationSec: { type: Number, default: 0 },
    genres: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    artworkUrl: { type: String, default: "" },
    // Public tagged preview used by the player
    audioUrl: { type: String, default: "" },
    previewKey: { type: String, default: "" },
    artworkKey: { type: String, default: "" },
    // Private deliverables (storage keys, never public URLs)
    files: {
      mp3: { type: String, default: "" },
      wav: { type: String, default: "" },
      stems: { type: String, default: "" },
    },
    featured: { type: Boolean, default: false },
    free: { type: Boolean, default: false },
    plays: { type: Number, default: 0 },
    publishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
TrackSchema.index({ title: "text", tags: "text", genres: "text" });

export type TrackDoc = InferSchemaType<typeof TrackSchema>;
export const Track: Model<TrackDoc> =
  (mongoose.models.Track as Model<TrackDoc>) || mongoose.model<TrackDoc>("Track", TrackSchema);
