import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: [true, "Rating is required"], min: 1, max: 5 },
    comment: { type: String, default: "" },
  },
  { timestamps: true }
);

// one review per student per house
reviewSchema.index({ listing: 1, student: 1 }, { unique: true });

// recalc the listing's average rating
reviewSchema.statics.updateListingRating = async function (listingId) {
  const Listing = mongoose.model("Listing");
  const stats = await this.aggregate([
    { $match: { listing: new mongoose.Types.ObjectId(String(listingId)) } },
    { $group: { _id: "$listing", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const avg = stats[0] ? Math.round(stats[0].avg * 10) / 10 : 0;
  const count = stats[0] ? stats[0].count : 0;
  await Listing.updateOne({ _id: listingId }, { avgRating: avg, reviewCount: count });
};

export default mongoose.model("Review", reviewSchema);
