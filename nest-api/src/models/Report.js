import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing" },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reason: {
      type: String,
      required: [true, "Reason is required"],
      enum: ["fake_listing", "wrong_price", "already_rented", "scam", "rude_agent", "other"],
    },
    details: String,
    status: { type: String, enum: ["open", "resolved", "dismissed"], default: "open" },
    adminNote: String,
  },
  { timestamps: true }
);

export default mongoose.model("Report", reportSchema);
