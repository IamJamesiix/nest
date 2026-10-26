import Listing from "../models/Listing.js";
import { AppError, toArray, escapeRegex, fileUrl } from "../utils/helpers.js";
import { AMENITIES, normalizeAmenities } from "../utils/amenities.js";

// fields an agent is allowed to set
const EDITABLE = [
  "title", "description", "photos", "area", "address", "lat", "lng", "distanceFromCampusKm",
  "roomType", "bedrooms", "bathrooms", "isShared", "spacesForRoommates", "amenities",
  "rent", "rentPeriod", "agencyFee", "legalFee", "cautionFee", "serviceCharge", "otherFees",
];

const pickFields = (body = {}) => {
  const data = {};
  for (const key of EDITABLE) if (body[key] !== undefined) data[key] = body[key];
  if (data.amenities !== undefined) data.amenities = normalizeAmenities(data.amenities);
  if (data.photos !== undefined && !Array.isArray(data.photos)) data.photos = [data.photos];
  return data;
};

// only the agent who owns it (or admin) can touch it
const getOwnListing = async (req) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new AppError("Listing not found", 404);
  if (req.user.role !== "admin" && String(listing.agent) !== String(req.user._id)) {
    throw new AppError("This is not your listing", 403);
  }
  return listing;
};

const costBreakdown = (listing, split = 1) => {
  const items = [
    { name: "Rent", amount: listing.rent, note: `per ${listing.rentPeriod.replace("ly", "")}` },
    { name: "Agency fee", amount: listing.agencyFee },
    { name: "Legal fee", amount: listing.legalFee },
    { name: "Caution fee", amount: listing.cautionFee },
    { name: "Service charge", amount: listing.serviceCharge },
    ...(listing.otherFees || []).map((f) => ({ name: f.name, amount: f.amount })),
  ].filter((i) => i.amount > 0 || i.name === "Rent");

  const total = listing.calcTotal();
  const people = Math.max(1, Number(split) || 1);
  return {
    items,
    total,
    rentPeriod: listing.rentPeriod,
    splitBetween: people,
    perPerson: Math.ceil(total / people),
  };
};

// ---------------- agent side ----------------

// POST /api/listings
export const createListing = async (req, res) => {
  const data = pickFields(req.body);
  const listing = await Listing.create({ ...data, agent: req.user._id, status: "available", lastConfirmedAt: new Date() });
  res.status(201).json({ listing, costBreakdown: costBreakdown(listing) });
};

// PATCH /api/listings/:id
export const updateListing = async (req, res) => {
  const listing = await getOwnListing(req);
  listing.set(pickFields(req.body));
  listing.lastConfirmedAt = new Date(); // editing counts as confirming it's still correct
  if (listing.status === "expired") listing.status = "available";
  await listing.save();
  res.json({ listing, costBreakdown: costBreakdown(listing) });
};

// DELETE /api/listings/:id
export const deleteListing = async (req, res) => {
  const listing = await getOwnListing(req);
  await listing.deleteOne();
  res.json({ message: "Listing deleted" });
};

// POST /api/listings/:id/photos  (multipart, field name "photos", up to 8)
export const uploadPhotos = async (req, res) => {
  const listing = await getOwnListing(req);
  if (!req.files || !req.files.length) throw new AppError("Attach at least one image in the 'photos' field", 400);
  listing.photos.push(...req.files.map((f) => fileUrl(req, f)));
  await listing.save();
  res.json({ photos: listing.photos });
};

// PATCH /api/listings/:id/status  { status: "available" | "pending" | "rented" }
export const updateStatus = async (req, res) => {
  const { status } = req.body || {};
  if (!["available", "pending", "rented"].includes(status)) {
    throw new AppError("Status must be available, pending or rented", 400);
  }
  const listing = await getOwnListing(req);
  listing.status = status;
  listing.lastConfirmedAt = new Date();
  await listing.save();
  res.json({ listing });
};

// PATCH /api/listings/:id/reconfirm  -> "yes this house is still as listed"
export const reconfirmListing = async (req, res) => {
  const listing = await getOwnListing(req);
  if (listing.status === "expired") listing.status = (req.body && req.body.status) || "available";
  listing.lastConfirmedAt = new Date();
  await listing.save();
  res.json({ message: "Listing reconfirmed", listing });
};

// GET /api/listings/agent/mine
export const myListings = async (req, res) => {
  const filter = { agent: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const listings = await Listing.find(filter).sort("-updatedAt");

  const days = Number(process.env.LISTING_EXPIRY_DAYS || 30);
  const withExpiry = listings.map((l) => {
    const expiresAt = new Date(l.lastConfirmedAt.getTime() + days * 86400000);
    return { ...l.toJSON(), expiresAt, needsReconfirm: l.status === "expired" || expiresAt - Date.now() < 5 * 86400000 };
  });
  res.json({ count: listings.length, listings: withExpiry });
};

// ---------------- public / student side ----------------

// GET /api/listings/amenities  -> standard list for the filter checkboxes + how many live houses have each
export const amenityList = async (req, res) => {
  const counts = await Listing.aggregate([
    { $match: { status: { $in: ["available", "pending"] } } },
    { $unwind: "$amenities" },
    { $group: { _id: "$amenities", count: { $sum: 1 } } },
  ]);
  const map = Object.fromEntries(counts.map((c) => [c._id, c.count]));
  res.json({ amenities: AMENITIES.map((a) => ({ ...a, count: map[a.key] || 0 })) });
};

// GET /api/listings?maxBudget=&minBudget=&area=&maxDistance=&roomType=&bedrooms=&minBedrooms=&amenities=&maxAgencyFee=&noAgencyFee=&shared=&rentPeriod=&status=&q=&sort=&page=&limit=
export const searchListings = async (req, res) => {
  const q = req.query;
  const filter = {};

  // by default hide expired and rented houses
  if (q.status) filter.status = { $in: toArray(q.status) };
  else filter.status = { $in: ["available", "pending"] };

  if (q.maxBudget || q.minBudget) {
    filter.totalCost = {};
    if (q.maxBudget) filter.totalCost.$lte = Number(q.maxBudget);
    if (q.minBudget) filter.totalCost.$gte = Number(q.minBudget);
  }
  if (q.area) {
    const areas = toArray(q.area).map((a) => new RegExp(escapeRegex(a), "i"));
    filter.area = { $in: areas };
  }
  if (q.maxDistance) filter.distanceFromCampusKm = { $lte: Number(q.maxDistance) };
  if (q.roomType) filter.roomType = { $in: toArray(q.roomType) };
  if (q.bedrooms) filter.bedrooms = Number(q.bedrooms);
  if (q.minBedrooms) filter.bedrooms = { $gte: Number(q.minBedrooms) };
  if (q.amenities) filter.amenities = { $all: normalizeAmenities(q.amenities) };
  if (q.electricity24 === "true") filter.amenities = { ...(filter.amenities || {}), $all: [...new Set([...(filter.amenities?.$all || []), "24hr electricity"])] };
  if (q.maxAgencyFee) filter.agencyFee = { $lte: Number(q.maxAgencyFee) };
  if (q.noAgencyFee === "true") filter.agencyFee = 0;
  if (q.shared === "true") filter.isShared = true;
  if (q.shared === "false") filter.isShared = false;
  if (q.rentPeriod) filter.rentPeriod = q.rentPeriod;
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), "i");
    filter.$or = [{ title: rx }, { description: rx }, { area: rx }, { address: rx }];
  }

  const sorts = {
    price_asc: { totalCost: 1 },
    price_desc: { totalCost: -1 },
    distance: { distanceFromCampusKm: 1 },
    rating: { avgRating: -1 },
    newest: { createdAt: -1 },
  };
  const sort = sorts[q.sort] || sorts.newest;

  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(q.limit) || 12));

  const [listings, total] = await Promise.all([
    Listing.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("agent", "name phone agentInfo.businessName agentInfo.verificationStatus"),
    Listing.countDocuments(filter),
  ]);

  res.json({ total, page, pages: Math.ceil(total / limit), listings });
};

// GET /api/listings/compare?ids=id1,id2,id3
export const compareListings = async (req, res) => {
  const ids = String(req.query.ids || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (ids.length < 2 || ids.length > 4) throw new AppError("Send 2 to 4 listing ids, e.g. ?ids=a,b", 400);

  const listings = await Listing.find({ _id: { $in: ids } }).populate("agent", "name agentInfo.businessName agentInfo.verificationStatus");
  if (listings.length < 2) throw new AppError("Could not find enough of those listings", 404);

  const cheapest = listings.reduce((a, b) => (a.totalCost <= b.totalCost ? a : b));
  const withDistance = listings.filter((l) => l.distanceFromCampusKm != null);
  const closest = withDistance.length ? withDistance.reduce((a, b) => (a.distanceFromCampusKm <= b.distanceFromCampusKm ? a : b)) : null;
  const bestRated = listings.reduce((a, b) => (a.avgRating >= b.avgRating ? a : b));

  const rows = listings.map((l) => ({
    id: l._id,
    title: l.title,
    area: l.area,
    roomType: l.roomType,
    bedrooms: l.bedrooms,
    isShared: l.isShared,
    distanceFromCampusKm: l.distanceFromCampusKm,
    rent: l.rent,
    rentPeriod: l.rentPeriod,
    agencyFee: l.agencyFee,
    totalCost: l.totalCost,
    amenities: l.amenities,
    status: l.status,
    avgRating: l.avgRating,
    reviewCount: l.reviewCount,
    agentVerified: l.agent?.agentInfo?.verificationStatus === "approved",
    lastConfirmedAt: l.lastConfirmedAt,
    photo: l.photos[0] || null,
  }));

  res.json({
    listings: rows,
    highlights: {
      cheapest: cheapest._id,
      closest: closest ? closest._id : null,
      bestRated: bestRated.reviewCount ? bestRated._id : null,
    },
  });
};

// GET /api/listings/:id
export const getListing = async (req, res) => {
  const listing = await Listing.findById(req.params.id).populate("agent", "name phone agentInfo.businessName agentInfo.officeAddress agentInfo.verificationStatus");
  if (!listing) throw new AppError("Listing not found", 404);
  res.json({ listing, costBreakdown: costBreakdown(listing) });
};

// GET /api/listings/:id/cost?split=2   -> fee breakdown + per person if sharing with roommates
export const getCost = async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new AppError("Listing not found", 404);
  res.json(costBreakdown(listing, req.query.split));
};
