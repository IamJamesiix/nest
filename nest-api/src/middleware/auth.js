import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { AppError } from "../utils/helpers.js";

// must be logged in
export const protect = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.split(" ")[1] : null;
  if (!token) throw new AppError("Not logged in", 401);

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new AppError("Invalid or expired token, log in again", 401);
  }

  const user = await User.findById(decoded.id);
  if (!user) throw new AppError("User no longer exists", 401);
  if (user.isBanned) throw new AppError("This account has been banned", 403);

  req.user = user;
  next();
};

// only some roles allowed, e.g. allow("agent", "admin")
export const allow = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    throw new AppError(`Only ${roles.join(" or ")} accounts can do this`, 403);
  }
  next();
};

// agent must have been approved by admin
export const verifiedAgent = (req, res, next) => {
  if (req.user.role === "admin") return next();
  if (req.user.role !== "agent" || req.user.agentInfo?.verificationStatus !== "approved") {
    throw new AppError("Only verified agents can do this. Submit your verification and wait for admin approval.", 403);
  }
  next();
};
