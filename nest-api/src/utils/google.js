import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import { AppError } from "./helpers.js";

let client;

// checks the token the frontend got from Google, returns the user's google info
export const verifyGoogleToken = async (credential) => {
  if (!process.env.GOOGLE_CLIENT_ID) throw new AppError("Google sign-in is not set up on the server (GOOGLE_CLIENT_ID missing)", 500);
  if (!client) client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    return ticket.getPayload(); // { sub, email, email_verified, name, picture }
  } catch {
    throw new AppError("Google sign-in failed, try again", 401);
  }
};

// sign in if the account exists, sign up if it doesn't
export const findOrCreateGoogleUser = async (payload, role = "student") => {
  const { sub: googleId, email, email_verified, name, picture } = payload;
  if (!email || !email_verified) throw new AppError("Your Google email is not verified", 400);

  // 1. already signed in with google before
  let user = await User.findOne({ googleId });
  if (user) return { user, isNew: false };

  // 2. has an email/password account with the same email -> link google to it
  user = await User.findOne({ email: email.toLowerCase() });
  if (user) {
    user.googleId = googleId;
    if (!user.avatar && picture) user.avatar = picture;
    if (!user.authProviders.includes("google")) user.authProviders.push("google");
    await user.save();
    return { user, isNew: false };
  }

  // 3. brand new user -> create account with the role they picked on the frontend
  if (!["student", "agent"].includes(role)) throw new AppError("Role must be student or agent", 400);

  const data = { name: name || email.split("@")[0], email, googleId, avatar: picture, role, authProviders: ["google"] };
  if (role === "agent") data.agentInfo = { verificationStatus: "not_submitted" };

  user = await User.create(data);
  return { user, isNew: true };
};
