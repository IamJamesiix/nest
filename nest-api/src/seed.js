// fills the database with demo data for the presentation
// run: npm run seed   (WARNING: wipes existing data first)
import "dotenv/config";
import mongoose from "mongoose";
import User from "./models/User.js";
import Listing from "./models/Listing.js";
import Inspection from "./models/Inspection.js";
import Review from "./models/Review.js";
import RoommateProfile from "./models/RoommateProfile.js";
import Report from "./models/Report.js";

const days = (n) => new Date(Date.now() + n * 86400000);
const photo = (seed) => [`https://picsum.photos/seed/${seed}a/800/600`, `https://picsum.photos/seed/${seed}b/800/600`];

await mongoose.connect(process.env.MONGO_URI);
console.log("connected, clearing old data...");

await Promise.all([User, Listing, Inspection, Review, RoommateProfile, Report].map((M) => M.deleteMany({})));

// users (User.create runs the password hashing)
const admin = await User.create({ name: "Nest Admin", email: "admin@nest.com", password: "password123", role: "admin" });

const agent = await User.create({
  name: "Tunde Adeyemi", email: "agent@nest.com", phone: "08031234567", password: "password123", role: "agent",
  agentInfo: { businessName: "Tunde Homes Ile-Ife", officeAddress: "Mayfair, Ile-Ife", idType: "nin", idNumber: "12345678901", idDocumentUrl: "https://picsum.photos/seed/nin1/600/400", verificationStatus: "approved", submittedAt: days(-20), verifiedAt: days(-19) },
});
const agent2 = await User.create({
  name: "Bisi Ogunleye", email: "agent2@nest.com", phone: "08051112222", password: "password123", role: "agent",
  agentInfo: { businessName: "Campus Nest Realty", officeAddress: "Asherifa, Ile-Ife", idType: "cac", idNumber: "RC1234567", idDocumentUrl: "https://picsum.photos/seed/cac1/600/400", verificationStatus: "approved", submittedAt: days(-15), verifiedAt: days(-14) },
});
const pendingAgent = await User.create({
  name: "Kola Bello", email: "pending@nest.com", phone: "08099998888", password: "password123", role: "agent",
  agentInfo: { businessName: "Kola Properties", idType: "drivers_license", idNumber: "LAG12345AB", idDocumentUrl: "https://picsum.photos/seed/dl1/600/400", verificationStatus: "pending", submittedAt: days(-1) },
});

const student = await User.create({ name: "Festus Student", email: "student@nest.com", phone: "08012345678", password: "password123", role: "student" });
const student2 = await User.create({ name: "Amaka Obi", email: "amaka@nest.com", phone: "08022223333", password: "password123", role: "student" });
const student3 = await User.create({ name: "Daniel Okafor", email: "daniel@nest.com", phone: "08044445555", password: "password123", role: "student" });

// listings - using .create one by one so totalCost is calculated
const raw = [
  { agent: agent._id, title: "Neat self-con at Mayfair", area: "Mayfair", address: "Off Mayfair junction", distanceFromCampusKm: 1.2, roomType: "self_contained", bedrooms: 1, amenities: ["water", "prepaid meter", "tiled", "fenced"], rent: 180000, agencyFee: 20000, legalFee: 10000, cautionFee: 10000, description: "Clean self-contained room, close to the school gate." },
  { agent: agent._id, title: "Single room, walking distance to campus", area: "Lagere", distanceFromCampusKm: 2.5, roomType: "single_room", bedrooms: 1, amenities: ["water", "shared toilet"], rent: 80000, agencyFee: 10000, description: "Budget single room, shared toilet and kitchen." },
  { agent: agent._id, title: "Room and parlour, Asherifa", area: "Asherifa", distanceFromCampusKm: 3.8, roomType: "room_and_parlour", bedrooms: 1, amenities: ["water", "prepaid meter", "parking", "security"], rent: 250000, agencyFee: 25000, legalFee: 15000, serviceCharge: 10000, description: "Spacious room and parlour in a quiet compound." },
  { agent: agent2._id, title: "2-bedroom flat for sharing (2 spaces left)", area: "Modomo", distanceFromCampusKm: 4.1, roomType: "shared_apartment", bedrooms: 2, spacesForRoommates: 2, amenities: ["water", "wifi", "prepaid meter", "kitchen"], rent: 360000, agencyFee: 30000, cautionFee: 20000, description: "Share a 2-bedroom flat with other OAU students. Rent split between occupants." },
  { agent: agent2._id, title: "Mini flat near Damico", area: "Damico", distanceFromCampusKm: 2.0, roomType: "mini_flat", bedrooms: 1, amenities: ["water", "prepaid meter", "tiled", "fenced", "security"], rent: 300000, agencyFee: 0, legalFee: 15000, otherFees: [{ name: "Waste disposal", amount: 5000 }], description: "No agency fee! Direct from landlord through our office." },
  { agent: agent2._id, title: "Hostel bedspace, Parakin", area: "Parakin", distanceFromCampusKm: 5.5, roomType: "hostel", bedrooms: 1, isShared: true, amenities: ["water", "generator", "security"], rent: 120000, rentPeriod: "semester", agencyFee: 5000, description: "Bedspace in a student hostel, paid per semester." },
  { agent: agent._id, title: "Self-con at Fajuyi (just rented)", area: "Fajuyi", distanceFromCampusKm: 3.0, roomType: "self_contained", bedrooms: 1, amenities: ["water", "prepaid meter"], rent: 200000, agencyFee: 20000, status: "rented", description: "Already taken, kept to show the rented status." },
  { agent: agent._id, title: "Old listing - not reconfirmed", area: "Lagere", distanceFromCampusKm: 2.7, roomType: "single_room", bedrooms: 1, amenities: ["water"], rent: 70000, agencyFee: 10000, description: "This one will show as expired because the agent hasn't reconfirmed it in 30+ days.", lastConfirmedAt: days(-45) },
];

const listings = [];
for (const [i, l] of raw.entries()) {
  listings.push(await Listing.create({ photos: photo(`nest${i}`), lastConfirmedAt: new Date(), ...l }));
}
// mark the old one expired straight away (the hourly job would do this too)
await Listing.updateOne({ _id: listings[7]._id }, { status: "expired" });

// reviews
await Review.create({ listing: listings[0]._id, agent: agent._id, student: student2._id, rating: 5, comment: "Exactly like the pictures. Agent was honest about all fees." });
await Review.create({ listing: listings[0]._id, agent: agent._id, student: student3._id, rating: 4, comment: "Nice place, water is steady." });
await Review.create({ listing: listings[1]._id, agent: agent._id, student: student2._id, rating: 3, comment: "Cheap but toilet is shared by many people." });
for (const id of [listings[0]._id, listings[1]._id]) await Review.updateListingRating(id);

// inspections
await Inspection.create({ listing: listings[0]._id, student: student._id, agent: agent._id, requestedDate: days(2), note: "I'm free after 2pm" });
await Inspection.create({ listing: listings[4]._id, student: student._id, agent: agent2._id, requestedDate: days(3), status: "confirmed" });
await Inspection.create({ listing: listings[2]._id, student: student2._id, agent: agent._id, requestedDate: days(1), status: "rescheduled", proposedDate: days(4), agentNote: "I'll be out of town, can we do Friday?" });

// bookmarks
student.bookmarks = [listings[0]._id, listings[3]._id];
await student.save();

// roommate profiles (students opting in)
await RoommateProfile.create({ student: student._id, budget: 200000, preferredAreas: ["modomo", "mayfair"], gender: "male", preferredGender: "male", department: "Computer Science", level: "300L", habits: ["quiet", "non-smoker"], contact: "08012345678", about: "Chill guy, I code a lot at night." });
await RoommateProfile.create({ student: student3._id, budget: 190000, preferredAreas: ["modomo"], gender: "male", preferredGender: "any", department: "Computer Science", level: "200L", habits: ["quiet", "early riser"], contact: "08044445555", hasHouse: true, listing: listings[3]._id, about: "Found a 2-bed flat at Modomo, need someone to share." });
await RoommateProfile.create({ student: student2._id, budget: 150000, preferredAreas: ["damico", "mayfair"], gender: "female", preferredGender: "female", department: "Law", level: "400L", habits: ["neat"], contact: "08022223333" });

// a report for the admin dashboard
await Report.create({ reporter: student2._id, listing: listings[1]._id, reason: "wrong_price", details: "Agent asked for extra 'inspection fee' not shown on Nest." });

console.log("\nseed done. log in with any of these (password: password123):");
console.log("  admin   -> admin@nest.com");
console.log("  agent   -> agent@nest.com      (verified)");
console.log("  agent   -> pending@nest.com    (waiting for verification)");
console.log("  student -> student@nest.com");
await mongoose.disconnect();
