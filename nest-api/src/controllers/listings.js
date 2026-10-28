import Listing from "../models/Listing.js";
import Review from "../models/Review.js";
import { AppError, toArray, escapeRegex } from "../utils/helpers.js";
import { AMENITIES, normalizeAmenities } from "../utils/amenities.js";
import { saveFile, deleteLocalFile, removeTempFiles } from "../utils/storage.js";
import { MAX_IMAGE_MB } from "../middleware/upload.js";

const AGENT_FIELDS = "name phone avatar agentInfo.businessName agentInfo.officeAddress agentInfo.verificationStatus";

// fields an agent is allowed to set (photos/videos only come through uploads)
const EDITABLE = [
  "title", "description", "area", "address", "landmark", "lat", "lng",
  "roomType", "bedrooms", "bathrooms", "isShared", "spacesForRoommates", "electricity24", "amenities",
  "rent", "rentPeriod", "agencyFee", "legalFee", "cautionFee", "serviceCharge", "otherFees",
];

const pickFields = (body = {}) => {
  const data = {};
  for (const key of EDITABLE) if (body[key] !== undefined) data[key] = body[key];
  if (data.amenities !== undefined) data.amenities = normalizeAmenities(data.amenities);
  return data;
};

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
  return { items, total, rentPeriod: listing.rentPeriod, splitBetween: people, perPerson: Math.ceil(total / people) };
};

// "7.5186" -> 7.5186, rejects junk
const toNumber = (value, label) => {
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new AppError(`${label} must be a number`, 400);
  return n;
};

// reads ?lat=&lng= (or ?near=lat,lng). returns null if not given
const readCoords = (q) => {
  let { lat, lng } = q;
  if (q.near) [lat, lng] = String(q.near).split(",");
  if (lat === undefined && lng === undefined) return null;
  const la = toNumber(lat, "lat");
  const ln = toNumber(lng, "lng");
  if (la === undefined || ln === undefined || la < -90 || la > 90 || ln < -180 || ln > 180) {
    throw new AppError("Send a valid location: lat (-90 to 90) and lng (-180 to 180)", 400);
  }
  return { lat: la, lng: ln };
};

// ---------------- agent side ----------------

// POST /api/listings
export const createListing = async (req, res) => {
  const listing = await Listing.create({ ...pickFields(req.body), agent: req.user._id, status: "available", lastConfirmedAt: new Date() });
  res.status(201).json({ listing, costBreakdown: costBreakdown(listing) });
};

// PATCH /api/listings/:id
export const updateListing = async (req, res) => {
  const listing = await getOwnListing(req);
  listing.set(pickFields(req.body));
  listing.lastConfirmedAt = new Date();
  if (listing.status === "expired") listing.status = "available";
  await listing.save();
  res.json({ listing, costBreakdown: costBreakdown(listing) });
};

// DELETE /api/listings/:id
export const deleteListing = async (req, res) => {
  const listing = await getOwnListing(req);
  [...listing.photos, ...listing.videos].forEach(deleteLocalFile);
  await Review.deleteMany({ listing: listing._id });
  await listing.deleteOne();
  res.json({ message: "Listing deleted" });
};

// POST /api/listings/:id/media  (multipart: "photos" up to 8 images, "videos" up to 3 videos)
// also mounted at /photos and /videos so either name works
export const uploadMedia = async (req, res) => {
  const photos = req.files?.photos || [];
  const videos = req.files?.videos || [];
  const all = [...photos, ...videos];

  try {
    const listing = await getOwnListing(req);
    if (!all.length) throw new AppError("Attach files in the 'photos' and/or 'videos' fields", 400);

    const bigPhoto = photos.find((p) => p.size > MAX_IMAGE_MB * 1024 * 1024);
    if (bigPhoto) throw new AppError(`Each photo must be ${MAX_IMAGE_MB}MB or less`, 400);
    if (listing.photos.length + photos.length > 15) throw new AppError("A listing can have at most 15 photos", 400);
    if (listing.videos.length + videos.length > 5) throw new AppError("A listing can have at most 5 videos", 400);

    for (const p of photos) listing.photos.push(await saveFile(req, p, "listings/photos"));
    for (const v of videos) listing.videos.push(await saveFile(req, v, "listings/videos"));
    await listing.save();

    res.json({ photos: listing.photos, videos: listing.videos });
  } catch (err) {
    removeTempFiles(all); // don't leave rejected files lying around
    throw err;
  }
};

// DELETE /api/listings/:id/media  { url }  -> remove one photo or video
export const deleteMedia = async (req, res) => {
  const { url } = req.body || {};
  if (!url) throw new AppError("Send the url of the photo or video to remove", 400);
  const listing = await getOwnListing(req);

  const before = listing.photos.length + listing.videos.length;
  listing.photos = listing.photos.filter((p) => p !== url);
  listing.videos = listing.videos.filter((v) => v !== url);
  if (listing.photos.length + listing.videos.length === before) throw new AppError("That file is not on this listing", 404);

  deleteLocalFile(url);
  await listing.save();
  res.json({ photos: listing.photos, videos: listing.videos });
};

// PATCH /api/listings/:id/status
export const updateStatus = async (req, res) => {
  const { status } = req.body || {};
  if (!["available", "pending", "rented"].includes(status)) throw new AppError("Status must be available, pending or rented", 400);
  const listing = await getOwnListing(req);
  listing.status = status;
  listing.lastConfirmedAt = new Date();
  await listing.save();
  res.json({ listing });
};

// PATCH /api/listings/:id/reconfirm
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
  const listings = await Listing.find(filter).sort({ updatedAt: -1, _id: 1 });

  const days = Number(process.env.LISTING_EXPIRY_DAYS || 30);
  const withExpiry = listings.map((l) => {
    const expiresAt = new Date(l.lastConfirmedAt.getTime() + days * 86400000);
    return { ...l.toJSON(), expiresAt, needsReconfirm: l.status === "expired" || expiresAt - Date.now() < 5 * 86400000 };
  });
  res.json({ count: listings.length, listings: withExpiry });
};

// ---------------- public / student side ----------------

// GET /api/listings/amenities
export const amenityList = async (req, res) => {
  const counts = await Listing.aggregate([
    { $match: { status: { $in: ["available", "pending"] } } },
    { $unwind: "$amenities" },
    { $group: { _id: "$amenities", count: { $sum: 1 } } },
  ]);
  const map = Object.fromEntries(counts.map((c) => [c._id, c.count]));
  res.json({ amenities: AMENITIES.map((a) => ({ ...a, count: map[a.key] || 0 })) });
};

// GET /api/listings/areas/nearby?lat=&lng=&radiusKm=10
// areas with houses close to the user, nearest first (built from real listings, nothing hard-coded)
export const nearbyAreas = async (req, res) => {
  const coords = readCoords(req.query);
  if (!coords) throw new AppError("Turn on location: send lat and lng", 400);
  const radiusKm = Math.min(50, Math.max(0.5, toNumber(req.query.radiusKm, "radiusKm") ?? 10));

  const areas = await Listing.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [coords.lng, coords.lat] },
        distanceField: "dist",
        distanceMultiplier: 0.001,
        maxDistance: radiusKm * 1000,
        query: { status: { $in: ["available", "pending"] }, area: { $ne: "" } },
        spherical: true,
        key: "location",
      },
    },
    {
      $group: {
        _id: { $toLower: "$area" },
        area: { $first: "$area" },
        houses: { $sum: 1 },
        nearestKm: { $min: "$dist" },
        cheapestTotal: { $min: "$totalCost" },
        lat: { $first: "$lat" },
        lng: { $first: "$lng" },
      },
    },
    { $sort: { nearestKm: 1, _id: 1 } },
    { $project: { _id: 0, area: 1, houses: 1, cheapestTotal: 1, nearestKm: { $round: ["$nearestKm", 2] }, lat: 1, lng: 1 } },
  ]);

  res.json({ radiusKm, count: areas.length, areas });
};

// GET /api/listings
// location:  lat, lng (or near=lat,lng), radiusKm (default 5, max 50)
// budget:    minBudget, maxBudget (inclusive range), budgetOn=total|rent (default total)
// others:    area, maxDistance, roomType, bedrooms, minBedrooms, amenities, electricity24,
//            maxAgencyFee, noAgencyFee, shared, rentPeriod, status, q, sort, page, limit
export const searchListings = async (req, res) => {
  const q = req.query;
  const filter = {};

  filter.status = q.status ? { $in: toArray(q.status) } : { $in: ["available", "pending"] };

  // budget: every house from the lower limit up to the cap, both ends included
  let minBudget = toNumber(q.minBudget, "minBudget");
  let maxBudget = toNumber(q.maxBudget, "maxBudget");
  if (minBudget !== undefined && maxBudget !== undefined && minBudget > maxBudget) [minBudget, maxBudget] = [maxBudget, minBudget];
  const budgetField = q.budgetOn === "rent" ? "rent" : "totalCost";
  if (minBudget !== undefined || maxBudget !== undefined) {
    filter[budgetField] = {};
    if (minBudget !== undefined) filter[budgetField].$gte = Math.max(0, minBudget);
    if (maxBudget !== undefined) filter[budgetField].$lte = maxBudget;
  }

  if (q.area) filter.area = { $in: toArray(q.area).map((a) => new RegExp(escapeRegex(a), "i")) };
  if (q.maxDistance) filter.distanceFromCampusKm = { $lte: toNumber(q.maxDistance, "maxDistance") };
  if (q.roomType) filter.roomType = { $in: toArray(q.roomType) };
  if (q.bedrooms) filter.bedrooms = toNumber(q.bedrooms, "bedrooms");
  if (q.minBedrooms) filter.bedrooms = { $gte: toNumber(q.minBedrooms, "minBedrooms") };
  if (q.amenities) filter.amenities = { $all: normalizeAmenities(q.amenities) };
  if (q.electricity24 === "true") filter.electricity24 = true;
  if (q.electricity24 === "false") filter.electricity24 = false;
  if (q.maxAgencyFee) filter.agencyFee = { $lte: toNumber(q.maxAgencyFee, "maxAgencyFee") };
  if (q.noAgencyFee === "true") filter.agencyFee = 0;
  if (q.shared === "true") filter.isShared = true;
  if (q.shared === "false") filter.isShared = false;
  if (q.rentPeriod) filter.rentPeriod = q.rentPeriod;
  if (q.hasVideo === "true") filter["videos.0"] = { $exists: true };
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), "i");
    filter.$or = [{ title: rx }, { description: rx }, { area: rx }, { address: rx }, { landmark: rx }];
  }

  const coords = readCoords(q);
  const budgetGiven = minBudget !== undefined || maxBudget !== undefined;

  // _id at the end of every sort = same order every time, pages never shuffle
  const sorts = {
    price_asc: { [budgetField]: 1, _id: 1 },
    price_desc: { [budgetField]: -1, _id: 1 },
    distance: { distanceFromCampusKm: 1, _id: 1 },
    rating: { avgRating: -1, reviewCount: -1, _id: 1 },
    newest: { createdAt: -1, _id: 1 },
    nearest: { distanceFromYouKm: 1, _id: 1 },
  };
  let sortKey = q.sort;
  if (!sorts[sortKey] || (sortKey === "nearest" && !coords)) {
    sortKey = coords ? "nearest" : budgetGiven ? "price_asc" : "newest";
  }
  const sort = sorts[sortKey];

  const page = Math.max(1, Math.floor(toNumber(q.page, "page") || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(toNumber(q.limit, "limit") || 12)));
  const skip = (page - 1) * limit;

  let listings;
  let total;
  let radiusKm;

  if (coords) {
    // houses near the user's exact location, with how far each one is from them
    radiusKm = Math.min(50, Math.max(0.5, toNumber(q.radiusKm, "radiusKm") ?? 5));
    const [result] = await Listing.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [coords.lng, coords.lat] },
          distanceField: "distanceFromYouKm",
          distanceMultiplier: 0.001,
          maxDistance: radiusKm * 1000,
          query: filter,
          spherical: true,
          key: "location",
        },
      },
      { $set: { distanceFromYouKm: { $round: ["$distanceFromYouKm", 2] } } },
      { $facet: { items: [{ $sort: sort }, { $skip: skip }, { $limit: limit }], total: [{ $count: "n" }] } },
    ]);
    listings = await Listing.populate(result.items, { path: "agent", select: AGENT_FIELDS });
    total = result.total[0]?.n || 0;
  } else {
    [listings, total] = await Promise.all([
      Listing.find(filter).sort(sort).skip(skip).limit(limit).populate("agent", AGENT_FIELDS),
      Listing.countDocuments(filter),
    ]);
  }

  res.json({
    total,
    page,
    pages: Math.ceil(total / limit),
    sort: sortKey,
    budget: budgetGiven ? { min: minBudget ?? 0, max: maxBudget ?? null, on: budgetField } : null,
    near: coords ? { ...coords, radiusKm } : null,
    listings,
  });
};

// GET /api/listings/compare?ids=a,b,c
export const compareListings = async (req, res) => {
  const ids = String(req.query.ids || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (ids.length < 2 || ids.length > 4) throw new AppError("Send 2 to 4 listing ids, e.g. ?ids=a,b", 400);

  const listings = await Listing.find({ _id: { $in: ids } }).populate("agent", "name agentInfo.businessName agentInfo.verificationStatus");
  if (listings.length < 2) throw new AppError("Could not find enough of those listings", 404);

  const cheapest = listings.reduce((a, b) => (a.totalCost <= b.totalCost ? a : b));
  const closest = listings.reduce((a, b) => (a.distanceFromCampusKm <= b.distanceFromCampusKm ? a : b));
  const bestRated = listings.reduce((a, b) => (a.avgRating >= b.avgRating ? a : b));

  const rows = listings.map((l) => ({
    id: l._id, title: l.title, area: l.area, roomType: l.roomType, bedrooms: l.bedrooms, isShared: l.isShared,
    distanceFromCampusKm: l.distanceFromCampusKm, electricity24: l.electricity24, rent: l.rent, rentPeriod: l.rentPeriod,
    agencyFee: l.agencyFee, totalCost: l.totalCost, amenities: l.amenities, status: l.status,
    avgRating: l.avgRating, reviewCount: l.reviewCount,
    agentVerified: l.agent?.agentInfo?.verificationStatus === "approved",
    lastConfirmedAt: l.lastConfirmedAt, photo: l.photos[0] || null, hasVideo: l.videos.length > 0,
  }));

  res.json({
    listings: rows,
    highlights: { cheapest: cheapest._id, closest: closest._id, bestRated: bestRated.reviewCount ? bestRated._id : null },
  });
};

// GET /api/listings/:id
export const getListing = async (req, res) => {
  const listing = await Listing.findById(req.params.id).populate("agent", AGENT_FIELDS);
  if (!listing) throw new AppError("Listing not found", 404);
  res.json({ listing, costBreakdown: costBreakdown(listing) });
};

// GET /api/listings/:id/cost?split=2
export const getCost = async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new AppError("Listing not found", 404);
  res.json(costBreakdown(listing, req.query.split));
};
