import mongoose from "mongoose";

// students who WANT a roommate create one of these. no profile = going solo.
const roommateSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    budget: { type: Number, required: [true, "Budget is required"], min: 0 }, // max they can pay (their share)
    preferredAreas: [{ type: String, lowercase: true, trim: true }],
    gender: { type: String, enum: ["male", "female"] },
    preferredGender: { type: String, enum: ["male", "female", "any"], default: "any" },
    department: String,
    level: String, // 100L, 200L...
    about: String,
    habits: [{ type: String, lowercase: true, trim: true }], // e.g. quiet, early riser, non-smoker
    contact: String, // phone / whatsapp they're happy to share
    hasHouse: { type: Boolean, default: false }, // already has a place, looking for someone to join
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing" }, // optional: the house they want to share
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("RoommateProfile", roommateSchema);
