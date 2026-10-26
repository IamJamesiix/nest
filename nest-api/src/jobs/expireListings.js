import Listing from "../models/Listing.js";

// any available/pending listing the agent hasn't reconfirmed in X days becomes "expired"
export const expireOldListings = async () => {
  const days = Number(process.env.LISTING_EXPIRY_DAYS || 30);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const result = await Listing.updateMany(
    { status: { $in: ["available", "pending"] }, lastConfirmedAt: { $lt: cutoff } },
    { $set: { status: "expired" } }
  );
  if (result.modifiedCount) console.log(`expired ${result.modifiedCount} old listing(s)`);
};

export const startExpiryJob = () => {
  expireOldListings().catch((e) => console.log("expiry job error:", e.message));
  // check every hour
  setInterval(() => {
    expireOldListings().catch((e) => console.log("expiry job error:", e.message));
  }, 60 * 60 * 1000);
};
