import User from "../models/User.js";
import { AppError } from "./helpers.js";

// make a new admin, or promote an existing account (by email) to admin
export const createOrPromoteAdmin = async ({ name, email, password }) => {
  if (!email) throw new AppError("Email is required", 400);
  const existing = await User.findOne({ email: String(email).toLowerCase() }).select("+password");

  if (existing) {
    existing.role = "admin";
    existing.isBanned = false;
    existing.agentInfo = undefined;
    if (password) {
      existing.password = password;
      if (!existing.authProviders.includes("local")) existing.authProviders.push("local");
    }
    if (name) existing.name = name;
    await existing.save();
    return { user: existing, created: false };
  }

  if (!name || !password) throw new AppError("Name and password are needed to create a new admin", 400);
  const user = await User.create({ name, email, password, role: "admin", authProviders: ["local"] });
  return { user, created: true };
};
