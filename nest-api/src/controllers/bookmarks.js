import Listing from "../models/Listing.js";
import { AppError } from "../utils/helpers.js";

// GET /api/bookmarks
export const myBookmarks = async (req, res) => {
  await req.user.populate({ path: "bookmarks", populate: { path: "agent", select: "name agentInfo.verificationStatus" } });
  res.json({ count: req.user.bookmarks.length, bookmarks: req.user.bookmarks });
};

// POST /api/bookmarks/:listingId
export const addBookmark = async (req, res) => {
  const listing = await Listing.findById(req.params.listingId);
  if (!listing) throw new AppError("Listing not found", 404);

  const has = req.user.bookmarks.some((id) => String(id) === String(listing._id));
  if (!has) {
    req.user.bookmarks.push(listing._id);
    await req.user.save();
  }
  res.json({ message: "Saved to favourites", bookmarks: req.user.bookmarks });
};

// DELETE /api/bookmarks/:listingId
export const removeBookmark = async (req, res) => {
  req.user.bookmarks = req.user.bookmarks.filter((id) => String(id) !== String(req.params.listingId));
  await req.user.save();
  res.json({ message: "Removed from favourites", bookmarks: req.user.bookmarks });
};
