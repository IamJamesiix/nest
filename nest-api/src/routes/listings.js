import { Router } from "express";
import {
  createListing, updateListing, deleteListing, uploadPhotos, updateStatus, reconfirmListing,
  myListings, searchListings, compareListings, getListing, getCost,
} from "../controllers/listings.js";
import { listingReviews, addReview, editReview, deleteReview } from "../controllers/reviews.js";
import { protect, allow, verifiedAgent } from "../middleware/auth.js";
import upload from "../middleware/upload.js";

const router = Router();

// public (anyone can browse)
router.get("/", searchListings);
router.get("/compare", compareListings);

// agent (these must come before "/:id")
router.get("/agent/mine", protect, allow("agent"), myListings);
router.post("/", protect, verifiedAgent, createListing);

router.get("/:id", getListing);
router.get("/:id/cost", getCost);
router.patch("/:id", protect, verifiedAgent, updateListing);
router.delete("/:id", protect, allow("agent", "admin"), deleteListing);
router.post("/:id/photos", protect, verifiedAgent, upload.array("photos", 8), uploadPhotos);
router.patch("/:id/status", protect, verifiedAgent, updateStatus);
router.patch("/:id/reconfirm", protect, verifiedAgent, reconfirmListing);

// reviews
router.get("/:id/reviews", listingReviews);
router.post("/:id/reviews", protect, allow("student"), addReview);
router.patch("/:id/reviews", protect, allow("student"), editReview);
router.delete("/:id/reviews", protect, allow("student"), deleteReview);

export default router;
