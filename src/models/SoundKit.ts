import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const SoundKitSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    priceCents: { type: Number, default: 0 },
    artworkUrl: { type: String, default: "" },
    // Private deliverable (storage key of the ZIP)
    fileKey: { type: String, default: "" },
  },
  { timestamps: true }
);

export type SoundKitDoc = InferSchemaType<typeof SoundKitSchema>;
export const SoundKit: Model<SoundKitDoc> =
  (mongoose.models.SoundKit as Model<SoundKitDoc>) ||
  mongoose.model<SoundKitDoc>("SoundKit", SoundKitSchema);
