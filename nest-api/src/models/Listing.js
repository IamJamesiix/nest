import mongoose from "mongoose";
import { distanceKm } from "../utils/helpers.js";

const otherFeeSchema = new mongoose.Schema(
  { name: { type: String, required: true }, amount: { type: Number, required: true, min: 0 } },
  { _id: false }
);

const listingSchema = new mongoose.Schema(
  {
    agent: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    title: { type: String, required: [true, "Title is required"], trim: true },
    description: { type: String, default: "" },
    photos: [String],

    // location
    area: { type: String, required: [true, "Area is required"], trim: true }, // e.g. Mayfair, Asherifa
    address: { type: String, default: "" },
    lat: Number,
    lng: Number,
    distanceFromCampusKm: { type: Number, min: 0 }, // auto from lat/lng, or agent can type it

    // house details
    roomType: {
      type: String,
      required: [true, "Room type is required"],
      enum: ["self_contained", "single_room", "room_and_parlour", "mini_flat", "flat", "shared_apartment", "hostel"],
    },
    bedrooms: { type: Number, default: 1, min: 0 },
    bathrooms: { type: Number, default: 1, min: 0 },
    isShared: { type: Boolean, default: false },
    spacesForRoommates: { type: Number, default: 0, min: 0 }, // for shared apartments
    amenities: [{ type: String, lowercase: true, trim: true }], // water, electricity, wifi, fence, security...

    // money (all in naira)
    rent: { type: Number, required: [true, "Rent is required"], min: 0 },
    rentPeriod: { type: String, enum: ["yearly", "semester", "monthly"], default: "yearly" },
    agencyFee: { type: Number, default: 0, min: 0 },
    legalFee: { type: Number, default: 0, min: 0 },
    cautionFee: { type: Number, default: 0, min: 0 },
    serviceCharge: { type: Number, default: 0, min: 0 },
    otherFees: [otherFeeSchema],
    totalCost: { type: Number, default: 0 }, // auto calculated, what you pay to move in

    // availability
    status: { type: String, enum: ["available", "pending", "rented", "expired"], default: "available" },
    lastConfirmedAt: { type: Date, default: Date.now },

    // ratings (updated when reviews come in)
    avgRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
  },
  { timestamps: true } // updatedAt = "date the listing was last updated"
);

listingSchema.methods.calcTotal = function () {
  const others = (this.otherFees || []).reduce((sum, f) => sum + (f.amount || 0), 0);
  return (this.rent || 0) + (this.agencyFee || 0) + (this.legalFee || 0) + (this.cautionFee || 0) + (this.serviceCharge || 0) + others;
};

listingSchema.pre("save", function () {
  this.totalCost = this.calcTotal();

  if (this.lat != null && this.lng != null && (this.isModified("lat") || this.isModified("lng") || this.distanceFromCampusKm == null)) {
    const campusLat = Number(process.env.CAMPUS_LAT || 7.5186);
    const campusLng = Number(process.env.CAMPUS_LNG || 4.5225);
    this.distanceFromCampusKm = distanceKm(this.lat, this.lng, campusLat, campusLng);
  }
  if (this.roomType === "shared_apartment") this.isShared = true;
});

listingSchema.index({ status: 1, totalCost: 1 });
listingSchema.index({ title: "text", description: "text", area: "text" });

export default mongoose.model("Listing", listingSchema);
