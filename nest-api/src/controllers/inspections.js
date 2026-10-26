import Inspection from "../models/Inspection.js";
import Listing from "../models/Listing.js";
import { AppError } from "../utils/helpers.js";

const populateAll = (query) =>
  query
    .populate("listing", "title area address photos status totalCost")
    .populate("student", "name phone email")
    .populate("agent", "name phone agentInfo.businessName");

// POST /api/inspections  { listing, date: "2026-11-02T14:00", note }
export const requestInspection = async (req, res) => {
  const { listing: listingId, date, note } = req.body || {};
  if (!listingId || !date) throw new AppError("listing and date are required", 400);

  const when = new Date(date);
  if (isNaN(when)) throw new AppError("Invalid date", 400);
  if (when < new Date()) throw new AppError("Pick a date in the future", 400);

  const listing = await Listing.findById(listingId);
  if (!listing) throw new AppError("Listing not found", 404);
  if (["rented", "expired"].includes(listing.status)) throw new AppError(`This house is ${listing.status}, you can't book an inspection`, 400);

  const already = await Inspection.findOne({ listing: listing._id, student: req.user._id, status: { $in: ["pending", "confirmed", "rescheduled"] } });
  if (already) throw new AppError("You already have an active inspection request for this house", 409);

  const inspection = await Inspection.create({
    listing: listing._id,
    student: req.user._id,
    agent: listing.agent,
    requestedDate: when,
    note,
  });
  res.status(201).json({ message: "Inspection request sent to the agent", inspection: await populateAll(Inspection.findById(inspection._id)) });
};

// GET /api/inspections/mine?upcoming=true   (student)
export const myInspections = async (req, res) => {
  const filter = { student: req.user._id };
  if (req.query.upcoming === "true") {
    filter.status = { $in: ["pending", "confirmed", "rescheduled"] };
    filter.$or = [{ requestedDate: { $gte: new Date() } }, { proposedDate: { $gte: new Date() } }];
  }
  if (req.query.status) filter.status = req.query.status;
  const inspections = await populateAll(Inspection.find(filter).sort("requestedDate"));
  res.json({ count: inspections.length, inspections });
};

// GET /api/inspections/agent?status=pending   (agent)
export const agentInspections = async (req, res) => {
  const filter = { agent: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const inspections = await populateAll(Inspection.find(filter).sort("requestedDate"));
  res.json({ count: inspections.length, inspections });
};

// PATCH /api/inspections/:id/respond  { action: "confirm" | "propose" | "decline" | "complete", proposedDate, agentNote }
export const respondToInspection = async (req, res) => {
  const { action, proposedDate, agentNote } = req.body || {};
  const inspection = await Inspection.findById(req.params.id);
  if (!inspection) throw new AppError("Inspection not found", 404);
  if (String(inspection.agent) !== String(req.user._id)) throw new AppError("This inspection is not for your listing", 403);

  if (action === "complete") {
    if (inspection.status !== "confirmed") throw new AppError("Only confirmed inspections can be marked completed", 400);
    inspection.status = "completed";
  } else {
    if (!["pending", "rescheduled"].includes(inspection.status)) throw new AppError(`This inspection is already ${inspection.status}`, 400);

    if (action === "confirm") {
      inspection.status = "confirmed";
    } else if (action === "propose") {
      const when = new Date(proposedDate);
      if (!proposedDate || isNaN(when)) throw new AppError("Give a valid proposedDate", 400);
      if (when < new Date()) throw new AppError("Proposed date must be in the future", 400);
      inspection.status = "rescheduled";
      inspection.proposedDate = when;
    } else if (action === "decline") {
      inspection.status = "declined";
    } else {
      throw new AppError("action must be confirm, propose, decline or complete", 400);
    }
  }
  if (agentNote) inspection.agentNote = agentNote;
  await inspection.save();
  res.json({ inspection: await populateAll(Inspection.findById(inspection._id)) });
};

// PATCH /api/inspections/:id/accept  -> student accepts the agent's proposed time
export const acceptProposal = async (req, res) => {
  const inspection = await Inspection.findById(req.params.id);
  if (!inspection) throw new AppError("Inspection not found", 404);
  if (String(inspection.student) !== String(req.user._id)) throw new AppError("Not your inspection", 403);
  if (inspection.status !== "rescheduled") throw new AppError("There is no proposed time to accept", 400);

  inspection.requestedDate = inspection.proposedDate;
  inspection.proposedDate = undefined;
  inspection.status = "confirmed";
  await inspection.save();
  res.json({ inspection: await populateAll(Inspection.findById(inspection._id)) });
};

// PATCH /api/inspections/:id/cancel  (student or agent)
export const cancelInspection = async (req, res) => {
  const inspection = await Inspection.findById(req.params.id);
  if (!inspection) throw new AppError("Inspection not found", 404);
  const mine = [String(inspection.student), String(inspection.agent)].includes(String(req.user._id));
  if (!mine) throw new AppError("Not your inspection", 403);
  if (!["pending", "confirmed", "rescheduled"].includes(inspection.status)) throw new AppError(`Can't cancel, it is already ${inspection.status}`, 400);

  inspection.status = "cancelled";
  await inspection.save();
  res.json({ inspection });
};
