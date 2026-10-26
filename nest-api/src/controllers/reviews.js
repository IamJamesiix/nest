import Review from "../models/Review.js";
import Listing from "../models/Listing.js";
import { AppError } from "../utils/helpers.js";

// GET /api/listings/:id/reviews
export const listingReviews = async (req, res) => {
  const reviews = await Review.find({ listing: req.params.id }).populate("student", "name").sort("-createdAt");
  res.json({ count: reviews.length, reviews });
};

// POST /api/listings/:id/reviews  { rating: 1-5, comment }
export const addReview = async (req, res) => {
  const { rating, comment } = req.body || {};
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new AppError("Listing not found", 404);

  const existing = await Review.findOne({ listing: listing._id, student: req.user._id });
  if (existing) throw new AppError("You already reviewed this house. Edit your review instead.", 409);

  const review = await Review.create({ listing: listing._id, agent: listing.agent, student: req.user._id, rating, comment });
  await Review.updateListingRating(listing._id);
  res.status(201).json({ review });
};

// PATCH /api/listings/:id/reviews  { rating, comment }  -> edit my review
export const editReview = async (req, res) => {
  const review = await Review.findOne({ listing: req.params.id, student: req.user._id });
  if (!review) throw new AppError("You have not reviewed this house", 404);
  const { rating, comment } = req.body || {};
  if (rating !== undefined) review.rating = rating;
  if (comment !== undefined) review.comment = comment;
  await review.save();
  await Review.updateListingRating(review.listing);
  res.json({ review });
};

// DELETE /api/listings/:id/reviews  -> delete my review
export const deleteReview = async (req, res) => {
  const review = await Review.findOneAndDelete({ listing: req.params.id, student: req.user._id });
  if (!review) throw new AppError("You have not reviewed this house", 404);
  await Review.updateListingRating(review.listing);
  res.json({ message: "Review deleted" });
};
