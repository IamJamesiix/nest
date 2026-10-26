import mongoose from "mongoose";

const inspectionSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    requestedDate: { type: Date, required: [true, "Pick a date and time"] },
    note: String,

    // pending -> confirmed / rescheduled (agent proposed new time) / declined
    // rescheduled -> confirmed (student accepts) ; anything -> cancelled ; confirmed -> completed
    status: {
      type: String,
      enum: ["pending", "confirmed", "rescheduled", "declined", "cancelled", "completed"],
      default: "pending",
    },
    proposedDate: Date,
    agentNote: String,
  },
  { timestamps: true }
);

export default mongoose.model("Inspection", inspectionSchema);
