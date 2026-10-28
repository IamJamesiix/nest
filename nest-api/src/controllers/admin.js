import User from "../models/User.js";
import Listing from "../models/Listing.js";
import Inspection from "../models/Inspection.js";
import Report from "../models/Report.js";
import Review from "../models/Review.js";
import { AppError, escapeRegex } from "../utils/helpers.js";
import { createOrPromoteAdmin } from "../utils/admin.js";

// GET /api/admin/stats
export const stats = async (req, res) => {
  const [students, agents, verifiedAgents, pendingAgents, listings, available, rented, expired, inspections, openReports] = await Promise.all([
    User.countDocuments({ role: "student" }),
    User.countDocuments({ role: "agent" }),
    User.countDocuments({ role: "agent", "agentInfo.verificationStatus": "approved" }),
    User.countDocuments({ role: "agent", "agentInfo.verificationStatus": "pending" }),
    Listing.countDocuments(),
    Listing.countDocuments({ status: "available" }),
    Listing.countDocuments({ status: "rented" }),
    Listing.countDocuments({ status: "expired" }),
    Inspection.countDocuments(),
    Report.countDocuments({ status: "open" }),
  ]);
  res.json({ users: { students, agents, verifiedAgents, pendingAgents }, listings: { total: listings, available, rented, expired }, inspections, openReports });
};

// GET /api/admin/users?role=agent&q=
export const listUsers = async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.q) filter.$or = [{ name: new RegExp(escapeRegex(req.query.q), "i") }, { email: new RegExp(escapeRegex(req.query.q), "i") }];
  const users = await User.find(filter).sort("-createdAt");
  res.json({ count: users.length, users });
};

// PATCH /api/admin/users/:id/ban  { banned: true | false }
export const banUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError("User not found", 404);
  if (user.role === "admin") throw new AppError("You can't ban an admin", 400);
  user.isBanned = req.body?.banned !== false;
  await user.save();
  res.json({ message: user.isBanned ? "User banned" : "User unbanned", user });
};

// GET /api/admin/agents?status=pending
export const listAgents = async (req, res) => {
  const filter = { role: "agent" };
  if (req.query.status) filter["agentInfo.verificationStatus"] = req.query.status;
  const agents = await User.find(filter).sort("-agentInfo.submittedAt");
  res.json({ count: agents.length, agents });
};

// PATCH /api/admin/agents/:id/verify  { approve: true }  or  { approve: false, reason: "blurry ID" }
export const verifyAgent = async (req, res) => {
  const { approve, reason } = req.body || {};
  const agent = await User.findOne({ _id: req.params.id, role: "agent" });
  if (!agent) throw new AppError("Agent not found", 404);
  if (agent.agentInfo?.verificationStatus === "not_submitted") throw new AppError("This agent hasn't submitted verification yet", 400);

  if (approve) {
    agent.agentInfo.verificationStatus = "approved";
    agent.agentInfo.verifiedAt = new Date();
    agent.agentInfo.rejectionReason = undefined;
  } else {
    agent.agentInfo.verificationStatus = "rejected";
    agent.agentInfo.rejectionReason = reason || "Verification details could not be confirmed";
  }
  await agent.save();
  res.json({ message: approve ? "Agent verified" : "Agent rejected", agent });
};

// GET /api/admin/listings?status=
export const listAllListings = async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const listings = await Listing.find(filter).populate("agent", "name email agentInfo.verificationStatus").sort("-createdAt");
  res.json({ count: listings.length, listings });
};

// DELETE /api/admin/listings/:id
export const removeListing = async (req, res) => {
  const listing = await Listing.findByIdAndDelete(req.params.id);
  if (!listing) throw new AppError("Listing not found", 404);
  await Review.deleteMany({ listing: listing._id });
  res.json({ message: "Listing removed" });
};

// GET /api/admin/reports?status=open
export const listReports = async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const reports = await Report.find(filter)
    .populate("reporter", "name email")
    .populate("listing", "title area status")
    .populate("agent", "name email")
    .sort("-createdAt");
  res.json({ count: reports.length, reports });
};

// PATCH /api/admin/reports/:id  { status: "resolved" | "dismissed", adminNote }
export const updateReport = async (req, res) => {
  const { status, adminNote } = req.body || {};
  if (!["open", "resolved", "dismissed"].includes(status)) throw new AppError("status must be open, resolved or dismissed", 400);
  const report = await Report.findByIdAndUpdate(req.params.id, { status, adminNote }, { new: true, runValidators: true });
  if (!report) throw new AppError("Report not found", 404);
  res.json({ report });
};

// POST /api/admin/admins  { name, email, password }  -> add another admin (or promote that email)
export const addAdmin = async (req, res) => {
  const { user, created } = await createOrPromoteAdmin(req.body || {});
  res.status(created ? 201 : 200).json({ message: created ? "Admin created" : "Existing account promoted to admin", user });
};

// PATCH /api/admin/users/:id/role  { role: "student" | "agent" | "admin" }
export const changeRole = async (req, res) => {
  const { role } = req.body || {};
  if (!["student", "agent", "admin"].includes(role)) throw new AppError("role must be student, agent or admin", 400);

  const user = await User.findById(req.params.id);
  if (!user) throw new AppError("User not found", 404);
  if (String(user._id) === String(req.user._id) && role !== "admin") throw new AppError("You can't remove your own admin role", 400);

  if (user.role === "admin" && role !== "admin") {
    const admins = await User.countDocuments({ role: "admin" });
    if (admins <= 1) throw new AppError("There must be at least one admin", 400);
  }

  user.role = role;
  if (role === "agent" && !user.agentInfo) user.agentInfo = { verificationStatus: "not_submitted" };
  if (role !== "agent") user.agentInfo = undefined;
  await user.save();
  res.json({ message: `Role changed to ${role}`, user });
};
