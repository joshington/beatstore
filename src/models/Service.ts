import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const ServiceSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    turnaround: { type: String, default: "" },
    needs: { type: String, default: "" },
    priceCents: { type: Number, default: 0 },
    imageUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

export type ServiceDoc = InferSchemaType<typeof ServiceSchema>;
export const Service: Model<ServiceDoc> =
  (mongoose.models.Service as Model<ServiceDoc>) ||
  mongoose.model<ServiceDoc>("Service", ServiceSchema);
