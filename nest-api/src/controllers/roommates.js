import RoommateProfile from "../models/RoommateProfile.js";
import { AppError, toArray } from "../utils/helpers.js";

const FIELDS = ["budget", "preferredAreas", "gender", "preferredGender", "department", "level", "about", "habits", "contact", "hasHouse", "listing", "isActive"];

// PUT /api/roommates/me  -> create or update my roommate profile (opting in to find a roommate)
export const upsertMyProfile = async (req, res) => {
  const data = {};
  for (const key of FIELDS) if (req.body?.[key] !== undefined) data[key] = req.body[key];
  if (data.preferredAreas !== undefined) data.preferredAreas = toArray(data.preferredAreas);
  if (data.habits !== undefined) data.habits = toArray(data.habits);

  let profile = await RoommateProfile.findOne({ student: req.user._id });
  if (profile) profile.set(data);
  else profile = new RoommateProfile({ ...data, student: req.user._id });
  await profile.save();
  res.json({ profile });
};

// GET /api/roommates/me
export const getMyProfile = async (req, res) => {
  const profile = await RoommateProfile.findOne({ student: req.user._id }).populate("listing", "title area totalCost");
  res.json({ profile }); // null = not looking for a roommate
};

// DELETE /api/roommates/me  -> going solo, remove me from roommate search
export const deleteMyProfile = async (req, res) => {
  await RoommateProfile.deleteOne({ student: req.user._id });
  res.json({ message: "You are no longer listed as looking for a roommate" });
};

// GET /api/roommates?maxBudget=&area=&gender=&hasHouse=
export const findRoommates = async (req, res) => {
  const q = req.query;
  const filter = { isActive: true, student: { $ne: req.user._id } };
  if (q.maxBudget) filter.budget = { $lte: Number(q.maxBudget) };
  if (q.minBudget) filter.budget = { ...(filter.budget || {}), $gte: Number(q.minBudget) };
  if (q.area) filter.preferredAreas = { $in: toArray(q.area) };
  if (q.gender) filter.gender = q.gender;
  if (q.hasHouse === "true") filter.hasHouse = true;
  if (q.hasHouse === "false") filter.hasHouse = false;

  const mine = await RoommateProfile.findOne({ student: req.user._id });

  let profiles = await RoommateProfile.find(filter)
    .populate("student", "name")
    .populate("listing", "title area totalCost")
    .sort("-updatedAt");

  // respect gender preferences both ways if I have a profile
  if (mine?.gender) {
    profiles = profiles.filter((p) => !p.preferredGender || p.preferredGender === "any" || p.preferredGender === mine.gender);
  }
  if (mine?.preferredGender && mine.preferredGender !== "any") {
    profiles = profiles.filter((p) => p.gender === mine.preferredGender);
  }

  // simple match score so the best matches show first
  const scored = profiles.map((p) => {
    let score = 0;
    if (mine) {
      if (mine.preferredAreas.some((a) => p.preferredAreas.includes(a))) score += 40;
      if (Math.abs(p.budget - mine.budget) <= mine.budget * 0.2) score += 30;
      score += Math.min(20, mine.habits.filter((h) => p.habits.includes(h)).length * 10);
      if (mine.department && p.department && mine.department.toLowerCase() === p.department.toLowerCase()) score += 10;
    }
    return { ...p.toJSON(), matchScore: score };
  });
  scored.sort((a, b) => b.matchScore - a.matchScore);

  res.json({ count: scored.length, roommates: scored });
};
