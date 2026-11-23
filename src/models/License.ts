import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const LicenseSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    priceCents: { type: Number, default: 0 },
    exclusive: { type: Boolean, default: false },
    popular: { type: Boolean, default: false },
    files: { type: [String], default: [] },
    // Which private files a buyer receives: any of "mp3" | "wav" | "stems"
    deliver: { type: [String], default: [] },
    terms: { type: [String], default: [] },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type LicenseDoc = InferSchemaType<typeof LicenseSchema>;
export const License: Model<LicenseDoc> =
  (mongoose.models.License as Model<LicenseDoc>) ||
  mongoose.model<LicenseDoc>("License", LicenseSchema);
