import Report from "../models/Report.js";
import Listing from "../models/Listing.js";
import { AppError } from "../utils/helpers.js";

// POST /api/reports  { listing?, agent?, reason, details }
export const createReport = async (req, res) => {
  const { listing, agent, reason, details } = req.body || {};
  if (!listing && !agent) throw new AppError("Report a listing or an agent", 400);

  let agentId = agent;
  if (listing) {
    const l = await Listing.findById(listing);
    if (!l) throw new AppError("Listing not found", 404);
    agentId = agentId || l.agent;
  }

  const report = await Report.create({ reporter: req.user._id, listing, agent: agentId, reason, details });
  res.status(201).json({ message: "Report sent. Thanks for keeping Nest safe.", report });
};
