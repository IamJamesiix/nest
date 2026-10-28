import { Router } from "express";
import {
  createListing, updateListing, deleteListing, uploadMedia, deleteMedia, updateStatus, reconfirmListing,
  myListings, searchListings, compareListings, getListing, getCost, amenityList, nearbyAreas,
} from "../controllers/listings.js";
import { listingReviews, addReview, editReview, deleteReview } from "../controllers/reviews.js";
import { protect, allow, verifiedAgent } from "../middleware/auth.js";
import { uploadMedia as mediaUpload } from "../middleware/upload.js";

const router = Router();

// public
router.get("/", searchListings);
router.get("/compare", compareListings);
router.get("/amenities", amenityList);
router.get("/areas/nearby", nearbyAreas);

// agent (before "/:id")
router.get("/agent/mine", protect, allow("agent"), myListings);
router.post("/", protect, verifiedAgent, createListing);

router.get("/:id", getListing);
router.get("/:id/cost", getCost);
router.patch("/:id", protect, verifiedAgent, updateListing);
router.delete("/:id", protect, allow("agent", "admin"), deleteListing);

// photos + videos (same handler, three names so the frontend can use whichever)
router.post("/:id/media", protect, verifiedAgent, mediaUpload, uploadMedia);
router.post("/:id/photos", protect, verifiedAgent, mediaUpload, uploadMedia);
router.post("/:id/videos", protect, verifiedAgent, mediaUpload, uploadMedia);
router.delete("/:id/media", protect, verifiedAgent, deleteMedia);

router.patch("/:id/status", protect, verifiedAgent, updateStatus);
router.patch("/:id/reconfirm", protect, verifiedAgent, reconfirmListing);

// reviews
router.get("/:id/reviews", listingReviews);
router.post("/:id/reviews", protect, allow("student"), addReview);
router.patch("/:id/reviews", protect, allow("student"), editReview);
router.delete("/:id/reviews", protect, allow("student"), deleteReview);

export default router;
