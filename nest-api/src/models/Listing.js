import mongoose from "mongoose";
import { distanceKm } from "../utils/helpers.js";

const otherFeeSchema = new mongoose.Schema(
  { name: { type: String, required: true }, amount: { type: Number, required: true, min: 0 } },
  { _id: false }
);

const LOCATION_MSG = "Pin the exact house location (lat and lng). Use 'my current location' while at the house, or drop a pin on the map.";

const listingSchema = new mongoose.Schema(
  {
    agent: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    title: { type: String, required: [true, "Title is required"], trim: true },
    description: { type: String, default: "" },
    photos: [String],
    videos: [String], // video tours of the house

    // exact GPS location of the house (required), area is just a display label
    lat: { type: Number, required: [true, LOCATION_MSG], min: [-90, "Invalid latitude"], max: [90, "Invalid latitude"] },
    lng: { type: Number, required: [true, LOCATION_MSG], min: [-180, "Invalid longitude"], max: [180, "Invalid longitude"] },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number] }, // [lng, lat] - mongo's order
    },
    area: { type: String, default: "", trim: true }, // e.g. "Mayfair" (frontend can fill this from the map)
    address: { type: String, default: "" },
    landmark: { type: String, default: "" }, // e.g. "behind the Total filling station"
    distanceFromCampusKm: { type: Number, min: 0 }, // always calculated from lat/lng

    // house details
    roomType: {
      type: String,
      required: [true, "Room type is required"],
      enum: ["self_contained", "single_room", "room_and_parlour", "mini_flat", "flat", "shared_apartment", "hostel"],
    },
    bedrooms: { type: Number, default: 1, min: 0 },
    bathrooms: { type: Number, default: 1, min: 0 },
    isShared: { type: Boolean, default: false },
    spacesForRoommates: { type: Number, default: 0, min: 0 },

    // compulsory: every agent must say yes or no
    electricity24: {
      type: Boolean,
      required: [true, "Say whether the house has 24hrs electricity (electricity24: true or false)"],
    },
    amenities: [{ type: String, lowercase: true, trim: true }],

    // money (naira)
    rent: { type: Number, required: [true, "Rent is required"], min: 0 },
    rentPeriod: { type: String, enum: ["yearly", "semester", "monthly"], default: "yearly" },
    agencyFee: { type: Number, default: 0, min: 0 },
    legalFee: { type: Number, default: 0, min: 0 },
    cautionFee: { type: Number, default: 0, min: 0 },
    serviceCharge: { type: Number, default: 0, min: 0 },
    otherFees: [otherFeeSchema],
    totalCost: { type: Number, default: 0 },

    // availability
    status: { type: String, enum: ["available", "pending", "rented", "expired"], default: "available" },
    lastConfirmedAt: { type: Date, default: Date.now },

    avgRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

listingSchema.methods.calcTotal = function () {
  const others = (this.otherFees || []).reduce((sum, f) => sum + (f.amount || 0), 0);
  return (this.rent || 0) + (this.agencyFee || 0) + (this.legalFee || 0) + (this.cautionFee || 0) + (this.serviceCharge || 0) + others;
};

listingSchema.pre("save", function () {
  this.totalCost = this.calcTotal();

  // keep the geo point and campus distance in sync with lat/lng
  if (this.lat != null && this.lng != null) {
    this.location = { type: "Point", coordinates: [this.lng, this.lat] };
    const campusLat = Number(process.env.CAMPUS_LAT || 7.5186);
    const campusLng = Number(process.env.CAMPUS_LNG || 4.5225);
    this.distanceFromCampusKm = distanceKm(this.lat, this.lng, campusLat, campusLng);
  }

  // the yes/no answer decides whether "24hr electricity" shows in amenities
  const list = (this.amenities || []).filter((a) => a !== "24hr electricity");
  this.amenities = this.electricity24 ? ["24hr electricity", ...list] : list;

  if (this.roomType === "shared_apartment") this.isShared = true;
});

listingSchema.index({ location: "2dsphere" });
listingSchema.index({ status: 1, totalCost: 1 });

export default mongoose.model("Listing", listingSchema);
