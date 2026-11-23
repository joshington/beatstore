import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const OrderSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    items: [
      {
        kind: { type: String, enum: ["track", "soundkit"], required: true },
        refId: { type: String, required: true },
        title: { type: String, required: true },
        licenseSlug: { type: String, default: "" },
        licenseName: { type: String, default: "" },
        priceCents: { type: Number, required: true },
        // Snapshot of what this purchase entitles the buyer to download
        deliver: { type: [String], default: [] },
        downloads: { type: Number, default: 0 },
      },
    ],
    subtotalCents: { type: Number, required: true },
    discountCents: { type: Number, default: 0 },
    totalCents: { type: Number, required: true },
    currency: { type: String, default: "UGX" },
    txRef: { type: String, unique: true, sparse: true },
    flwTransactionId: { type: String, default: "" },
    paidAt: { type: Date },
    emailedAt: { type: Date },
    lastLinkEmailAt: { type: Date },
    status: { type: String, enum: ["pending", "paid", "failed", "cancelled"], default: "pending" },
  },
  { timestamps: true }
);

export type OrderDoc = InferSchemaType<typeof OrderSchema>;
export const Order: Model<OrderDoc> =
  (mongoose.models.Order as Model<OrderDoc>) || mongoose.model<OrderDoc>("Order", OrderSchema);
