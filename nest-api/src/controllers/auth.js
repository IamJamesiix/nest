import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { AppError } from "../utils/helpers.js";
import { verifyGoogleToken, findOrCreateGoogleUser } from "../utils/google.js";

const makeToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// POST /api/auth/register  { name, email, phone, password, role: "student" | "agent", businessName? }
export const register = async (req, res) => {
  const { name, email, phone, password, role = "student", businessName, officeAddress } = req.body || {};

  if (!["student", "agent"].includes(role)) {
    throw new AppError("Role must be student or agent", 400);
  }
  if (!name || !email || !password) throw new AppError("Name, email and password are required", 400);

  const exists = await User.findOne({ email: String(email).toLowerCase() });
  if (exists) {
    const msg = exists.googleId && !exists.authProviders.includes("local")
      ? "This email is already registered with Google. Use 'Continue with Google' instead."
      : "An account with this email already exists";
    throw new AppError(msg, 409);
  }

  const data = { name, email, phone, password, role };
  if (role === "agent") data.agentInfo = { businessName, officeAddress, verificationStatus: "not_submitted" };

  const user = await User.create(data);
  res.status(201).json({
    message: role === "agent" ? "Agent account created. Submit your verification to start listing houses." : "Account created",
    token: makeToken(user),
    user,
  });
};

// POST /api/auth/login  { email, password }
export const login = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw new AppError("Email and password are required", 400);

  const user = await User.findOne({ email: String(email).toLowerCase() }).select("+password");
  if (user && !user.password && user.googleId) {
    throw new AppError("This account uses Google sign-in. Click 'Continue with Google'.", 400);
  }
  if (!user || !(await user.checkPassword(password))) {
    throw new AppError("Wrong email or password", 401);
  }
  if (user.isBanned) throw new AppError("This account has been banned", 403);

  res.json({ token: makeToken(user), user });
};

// GET /api/auth/me
export const me = async (req, res) => {
  res.json({ user: req.user });
};

// PATCH /api/auth/me  { name, phone }
export const updateMe = async (req, res) => {
  const { name, phone, businessName, officeAddress } = req.body || {};
  if (name) req.user.name = name;
  if (phone) req.user.phone = phone;
  if (req.user.role === "agent") {
    if (businessName) req.user.agentInfo.businessName = businessName;
    if (officeAddress) req.user.agentInfo.officeAddress = officeAddress;
  }
  await req.user.save();
  res.json({ user: req.user });
};

// POST /api/auth/google  { credential, role?: "student" | "agent" }
// credential = the ID token the frontend gets from the Google button
// role is only used the first time (sign up). existing users keep their role.
export const googleAuth = async (req, res) => {
  const { credential, role = "student" } = req.body || {};
  if (!credential) throw new AppError("Google credential is required", 400);

  const payload = await verifyGoogleToken(credential);
  const { user, isNew } = await findOrCreateGoogleUser(payload, role);
  if (user.isBanned) throw new AppError("This account has been banned", 403);

  res.status(isNew ? 201 : 200).json({
    message: isNew ? (user.role === "agent" ? "Agent account created. Submit your verification to start listing houses." : "Account created") : "Signed in",
    isNew,
    token: makeToken(user),
    user,
  });
};
