import User from "../models/User.js";
import Listing from "../models/Listing.js";
import { AppError, fileUrl } from "../utils/helpers.js";

// POST /api/agents/verification  (multipart: idType, idNumber, cacNumber?, idDocument file)
// how we confirm people are real agents: they send ID + document, admin checks and approves
export const submitVerification = async (req, res) => {
  const { idType, idNumber, cacNumber, businessName, officeAddress } = req.body || {};
  if (!idType || !idNumber) throw new AppError("idType and idNumber are required", 400);

  const info = req.user.agentInfo || {};
  if (info.verificationStatus === "approved") throw new AppError("You are already verified", 400);
  if (!req.file && !info.idDocumentUrl && !req.body.idDocumentUrl) {
    throw new AppError("Upload a photo/scan of your ID as idDocument", 400);
  }

  req.user.agentInfo = {
    ...(info.toObject ? info.toObject() : info),
    idType,
    idNumber,
    cacNumber,
    businessName: businessName || info.businessName,
    officeAddress: officeAddress || info.officeAddress,
    idDocumentUrl: req.file ? fileUrl(req, req.file) : req.body.idDocumentUrl || info.idDocumentUrl,
    verificationStatus: "pending",
    rejectionReason: undefined,
    submittedAt: new Date(),
  };
  await req.user.save();

  res.json({ message: "Verification submitted. An admin will review it.", agentInfo: req.user.agentInfo });
};

// GET /api/agents/verification  -> agent checks their own status
export const myVerification = async (req, res) => {
  res.json({ agentInfo: req.user.agentInfo });
};

// GET /api/agents/:id  -> public agent profile + their live listings
export const agentProfile = async (req, res) => {
  const agent = await User.findOne({ _id: req.params.id, role: "agent" }).select("name phone agentInfo.businessName agentInfo.officeAddress agentInfo.verificationStatus createdAt");
  if (!agent) throw new AppError("Agent not found", 404);

  const listings = await Listing.find({ agent: agent._id, status: { $ne: "expired" } }).sort("-createdAt");
  const rated = listings.filter((l) => l.reviewCount > 0);
  const avgRating = rated.length ? Math.round((rated.reduce((s, l) => s + l.avgRating, 0) / rated.length) * 10) / 10 : 0;

  res.json({
    agent,
    isVerified: agent.agentInfo?.verificationStatus === "approved",
    avgRating,
    listings,
  });
};
