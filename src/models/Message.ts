import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const MessageSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

export type MessageDoc = InferSchemaType<typeof MessageSchema>;
export const Message: Model<MessageDoc> =
  (mongoose.models.Message as Model<MessageDoc>) ||
  mongoose.model<MessageDoc>("Message", MessageSchema);

const SubscriberSchema = new Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, required: true, unique: true, lowercase: true },
  },
  { timestamps: true }
);

export type SubscriberDoc = InferSchemaType<typeof SubscriberSchema>;
export const Subscriber: Model<SubscriberDoc> =
  (mongoose.models.Subscriber as Model<SubscriberDoc>) ||
  mongoose.model<SubscriberDoc>("Subscriber", SubscriberSchema);
