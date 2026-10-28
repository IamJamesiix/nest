// checks every feature, then deletes everything it created (no dummy data left behind).
// 1. start the server:  npm run dev
// 2. in another terminal: npm run test:api
// it talks to API_URL (default http://localhost:5000/api) and creates its temporary admin
// in the database from MONGO_URI in .env, so both must point at the same database.
import "dotenv/config";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import Listing from "../src/models/Listing.js";
import Inspection from "../src/models/Inspection.js";
import Review from "../src/models/Review.js";
import RoommateProfile from "../src/models/RoommateProfile.js";
import Report from "../src/models/Report.js";
import { createOrPromoteAdmin } from "../src/utils/admin.js";
import { expireOldListings } from "../src/jobs/expireListings.js";
import { deleteLocalFile } from "../src/utils/storage.js";

const BASE = process.env.API_URL || "http://localhost:5000/api";
const TAG = `t${Date.now().toString(36)}`; // unique per run, used to find + delete test data
const PASS = "test-pass-123";
const email = (who) => `${who}.${TAG}@nest-test.dev`.toLowerCase();
let passed = 0, failed = 0;

const call = async (method, path, { token, body, form } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
  const res = await fetch(BASE + path, { method, headers, body: payload });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
};
const check = (label, ok, extra = "") => {
  if (ok) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; console.log(`  ✗ ${label} ${extra}`); }
};
const login = async (who) => (await call("POST", "/auth/login", { body: { email: email(who), password: PASS } })).data.token;
const register = async (who, role, extra = {}) => (await call("POST", "/auth/register", { body: { name: `${who} ${TAG}`, email: email(who), password: PASS, role, ...extra } })).data;
const ids = (list) => list.map((l) => String(l._id || l.id));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fileBlob = (type, bytes = 10) => new Blob([Buffer.alloc(bytes, 1)], { type });

// OAU main campus, and some points around it
const OAU = { lat: 7.5186, lng: 4.5225 };
const at = (dLat, dLng) => ({ lat: +(OAU.lat + dLat).toFixed(6), lng: +(OAU.lng + dLng).toFixed(6) });

await mongoose.connect(process.env.MONGO_URI);

try {
  // ---------------------------------------------------------------
  console.log(`\nSETUP (test tag: ${TAG})`);
  await createOrPromoteAdmin({ name: `Admin ${TAG}`, email: email("admin"), password: PASS });
  const admin = await login("admin");
  check("admin created with the create-admin logic, can log in", !!admin);

  console.log("\nAUTH");
  let r = await register("studentA", "student");
  check("student can register", !!r.token);
  r = await register("agentA", "agent", { businessName: "Test Homes" });
  check("agent can register (starts not_submitted)", r.user?.agentInfo?.verificationStatus === "not_submitted");
  const agentAId = r.user?._id;
  await register("agentB", "agent");
  await register("studentB", "student");
  await register("studentC", "student");
  r = await call("POST", "/auth/register", { body: { name: "x", email: email("sneaky"), password: PASS, role: "admin" } });
  check("nobody can sign up as admin", r.status === 400);
  r = await call("POST", "/auth/login", { body: { email: email("studentA"), password: "wrong-pass" } });
  check("wrong password rejected", r.status === 401);
  r = await call("POST", "/auth/google", { body: {} });
  check("google: missing credential rejected", r.status === 400);
  r = await call("POST", "/auth/google", { body: { credential: "fake.google.token" } });
  check("google: fake token rejected", r.status === 401 || r.status === 500);

  const studentA = await login("studentA");
  const studentB = await login("studentB");
  const studentC = await login("studentC");
  const agentA = await login("agentA");
  const agentB = await login("agentB");
  r = await call("GET", "/auth/me", { token: studentA });
  check("GET /auth/me works", r.data.user?.email === email("studentA"));

  console.log("\nADMIN ACCOUNTS");
  r = await call("POST", "/admin/admins", { token: studentA, body: { name: "x", email: email("hack"), password: PASS } });
  check("students can't create admins", r.status === 403);
  r = await call("POST", "/admin/admins", { token: admin, body: { name: `Admin2 ${TAG}`, email: email("admin2"), password: PASS } });
  check("admin adds another admin", r.status === 201 && r.data.user?.role === "admin");
  const admin2Id = r.data.user?._id;
  const admin2 = await login("admin2");
  check("new admin can log in and open dashboard", (await call("GET", "/admin/stats", { token: admin2 })).status === 200);
  r = await call("PATCH", `/admin/users/${admin2Id}/role`, { token: admin, body: { role: "student" } });
  check("admin can remove another admin's role", r.data.user?.role === "student");
  const meId = (await call("GET", "/auth/me", { token: admin })).data.user._id;
  r = await call("PATCH", `/admin/users/${meId}/role`, { token: admin, body: { role: "student" } });
  check("admin can't remove their own admin role", r.status === 400);

  console.log("\nAGENT VERIFICATION");
  const draft = { title: `x ${TAG}`, roomType: "single_room", rent: 1, electricity24: true, ...at(0.01, 0) };
  r = await call("POST", "/listings", { token: agentA, body: draft });
  check("unverified agent can't post listing", r.status === 403);
  const vform = () => {
    const f = new FormData();
    f.append("idType", "nin"); f.append("idNumber", "98765432100");
    f.append("idDocument", fileBlob("image/png"), "id.png");
    return f;
  };
  r = await call("POST", "/agents/verification", { token: agentA, form: vform() });
  check("agent submits ID → pending", r.data.agentInfo?.verificationStatus === "pending");
  await call("POST", "/agents/verification", { token: agentB, form: vform() });
  r = await call("GET", "/admin/agents?status=pending", { token: admin });
  check("admin sees pending agents", r.data.agents?.some((a) => a.email === email("agentA")));
  r = await call("PATCH", `/admin/agents/${agentAId}/verify`, { token: admin, body: { approve: true } });
  check("admin approves agent", r.data.agent?.agentInfo.verificationStatus === "approved");
  const agentBId = (await call("GET", "/auth/me", { token: agentB })).data.user._id;
  r = await call("PATCH", `/admin/agents/${agentBId}/verify`, { token: admin, body: { approve: false, reason: "blurry ID" } });
  check("admin rejects agent with reason", r.data.agent?.agentInfo.rejectionReason === "blurry ID");
  r = await call("POST", "/listings", { token: agentB, body: draft });
  check("rejected agent still can't post", r.status === 403);

  console.log("\nLISTINGS");
  r = await call("POST", "/listings", { token: agentA, body: { ...draft, lat: undefined, lng: undefined } });
  check("exact location (lat/lng) is required", r.status === 400 && /location/i.test(r.data.message));
  r = await call("POST", "/listings", { token: agentA, body: { ...draft, electricity24: undefined } });
  check("24hrs electricity answer is compulsory", r.status === 400 && /24hrs electricity/i.test(r.data.message));

  const make = async (body) => (await call("POST", "/listings", { token: agentA, body: { title: `${body.title} ${TAG}`, ...body, title: `${body.title} ${TAG}` } })).data.listing;
  const L1 = await make({ title: "Self-con Mayfair", area: "Mayfair", roomType: "self_contained", rent: 180000, agencyFee: 20000, legalFee: 10000, cautionFee: 10000, electricity24: true, amenities: "water, prepaid meter", ...at(0.009, 0) });
  const L2 = await make({ title: "Single room Lagere", area: "Lagere", roomType: "single_room", rent: 80000, agencyFee: 10000, electricity24: false, amenities: "water, 24/7 light", ...at(0.02, 0.012) });
  const L3 = await make({ title: "Room and parlour Asherifa", area: "Asherifa", roomType: "room_and_parlour", rent: 250000, agencyFee: 25000, legalFee: 15000, serviceCharge: 10000, electricity24: true, ...at(-0.03, 0.02) });
  const L4 = await make({ title: "Shared flat Modomo", area: "Modomo", roomType: "shared_apartment", bedrooms: 2, rent: 360000, agencyFee: 30000, cautionFee: 20000, electricity24: true, amenities: "wifi, borehole", ...at(0.035, -0.015) });
  const L5 = await make({ title: "Mini flat Damico", area: "Damico", roomType: "mini_flat", rent: 300000, legalFee: 15000, otherFees: [{ name: "Waste", amount: 5000 }], electricity24: true, ...at(0.015, 0.005) });
  const L6 = await make({ title: "Hostel Osogbo", area: "Osogbo", roomType: "hostel", rent: 120000, rentPeriod: "semester", agencyFee: 5000, electricity24: false, lat: 7.7827, lng: 4.5418 });
  check("verified agent creates listings", [L1, L2, L3, L4, L5, L6].every(Boolean));
  check("total cost auto-calculated (220000)", L1?.totalCost === 220000, `got ${L1?.totalCost}`);
  check("distance from campus calculated from GPS", L1?.distanceFromCampusKm > 0.9 && L1?.distanceFromCampusKm < 1.1, `got ${L1?.distanceFromCampusKm}`);
  check("electricity24 = true puts '24hr electricity' first in amenities", L1?.amenities[0] === "24hr electricity");
  check("electricity24 = false removes it even if typed in amenities", !L2?.amenities.includes("24hr electricity"));
  check("amenity wording normalised (borehole → water)", L4?.amenities.includes("water"));
  r = await call("PATCH", `/listings/${L1._id}`, { token: agentB, body: { rent: 1 } });
  check("agent can't edit someone else's listing", r.status === 403);
  r = await call("PATCH", `/listings/${L1._id}`, { token: agentA, body: { rent: 180000, electricity24: true } });
  check("agent edits own listing", r.data.listing?.totalCost === 220000);
  r = await call("GET", "/listings/agent/mine", { token: agentA });
  check("agent sees own listings with expiry date", r.data.count === 6 && r.data.listings[0].expiresAt);

  console.log("\nPHOTOS & VIDEOS");
  let f = new FormData();
  f.append("photos", fileBlob("image/jpeg"), "a.jpg");
  f.append("photos", fileBlob("image/png"), "b.png");
  f.append("videos", fileBlob("video/mp4", 1000), "tour.mp4");
  r = await call("POST", `/listings/${L1._id}/media`, { token: agentA, form: f });
  check("upload photos + video together", r.data.photos?.length === 2 && r.data.videos?.length === 1, JSON.stringify(r.data));
  const videoUrl = r.data.videos?.[0];
  f = new FormData(); f.append("videos", fileBlob("video/quicktime", 500), "tour.mov");
  r = await call("POST", `/listings/${L3._id}/videos`, { token: agentA, form: f });
  check("upload .mov video tour", r.data.videos?.length === 1);
  f = new FormData(); f.append("videos", fileBlob("application/zip"), "virus.zip");
  r = await call("POST", `/listings/${L1._id}/media`, { token: agentA, form: f });
  check("non-video file rejected", r.status === 400);
  f = new FormData(); f.append("photos", fileBlob("image/jpeg", 6 * 1024 * 1024), "big.jpg");
  r = await call("POST", `/listings/${L1._id}/media`, { token: agentA, form: f });
  check("photo over 5MB rejected", r.status === 400);
  f = new FormData(); f.append("photos", fileBlob("image/jpeg"), "c.jpg");
  r = await call("POST", `/listings/${L1._id}/media`, { token: agentB, form: f });
  check("other agents can't add media", r.status === 403);
  r = await call("GET", `/listings/${L1._id}`);
  check("students can view the video on the listing", r.data.listing?.videos?.[0] === videoUrl);
  r = await call("GET", `/listings?q=${TAG}&hasVideo=true`);
  check("filter: houses with video tours", same(ids(r.data.listings).sort(), [L1._id, L3._id].sort()));
  r = await call("DELETE", `/listings/${L3._id}/media`, { token: agentA, body: { url: (await call("GET", `/listings/${L3._id}`)).data.listing.videos[0] } });
  check("agent removes a video", r.data.videos?.length === 0);

  console.log("\nBUDGET RANGE (inclusive, stable)");
  r = await call("GET", `/listings?q=${TAG}&minBudget=90000&maxBudget=300000`);
  // totals: L2 90000, L6 125000, L1 220000, L3 300000 (L5 320000 and L4 410000 are outside)
  check("every house from min to max, both ends included", same(ids(r.data.listings), [L2._id, L6._id, L1._id, L3._id]), JSON.stringify(r.data.listings?.map((l) => l.totalCost)));
  check("budget results sorted lowest → highest by default", r.data.sort === "price_asc");
  const first = ids(r.data.listings);
  r = await call("GET", `/listings?q=${TAG}&minBudget=90000&maxBudget=300000`);
  check("same search twice → same order (no fluctuating)", same(ids(r.data.listings), first));
  r = await call("GET", `/listings?q=${TAG}&minBudget=300000&maxBudget=90000`);
  check("min and max typed the wrong way round still work", same(ids(r.data.listings), first));
  const p1 = (await call("GET", `/listings?q=${TAG}&minBudget=90000&maxBudget=300000&limit=2&page=1`)).data;
  const p2 = (await call("GET", `/listings?q=${TAG}&minBudget=90000&maxBudget=300000&limit=2&page=2`)).data;
  check("pages don't repeat or skip houses", same([...ids(p1.listings), ...ids(p2.listings)], first) && p1.total === 4);
  r = await call("GET", `/listings?q=${TAG}&minBudget=80000&maxBudget=180000&budgetOn=rent`);
  check("budgetOn=rent uses rent only", same(ids(r.data.listings), [L2._id, L6._id, L1._id]));
  r = await call("GET", `/listings?q=${TAG}&maxBudget=abc`);
  check("junk budget value rejected clearly", r.status === 400);

  console.log("\nLOCATION (houses near you)");
  r = await call("GET", `/listings?q=${TAG}&lat=${OAU.lat}&lng=${OAU.lng}&radiusKm=5`);
  const near = r.data.listings || [];
  check("houses within 5km of the user (far one excluded)", same(ids(near).sort(), [L1._id, L2._id, L3._id, L4._id, L5._id].sort()) && !ids(near).includes(L6._id));
  check("each house shows distance from the user", near.every((l) => typeof l.distanceFromYouKm === "number" && l.distanceFromYouKm <= 5));
  check("sorted nearest first", near.every((l, i) => i === 0 || l.distanceFromYouKm >= near[i - 1].distanceFromYouKm) && r.data.sort === "nearest");
  check("agent details still included", near[0]?.agent?.agentInfo?.verificationStatus === "approved");
  r = await call("GET", `/listings?q=${TAG}&lat=${OAU.lat}&lng=${OAU.lng}&radiusKm=50`);
  check("bigger radius includes far houses", ids(r.data.listings).includes(L6._id));
  r = await call("GET", `/listings?q=${TAG}&lat=7.7827&lng=4.5418&radiusKm=3`);
  check("works anywhere (user in Osogbo sees Osogbo house)", same(ids(r.data.listings), [L6._id]));
  r = await call("GET", `/listings?q=${TAG}&lat=${OAU.lat}&lng=${OAU.lng}&radiusKm=5&minBudget=90000&maxBudget=300000&sort=price_asc`);
  check("location + budget range together", same(ids(r.data.listings), [L2._id, L1._id, L3._id]));
  r = await call("GET", `/listings?lat=200&lng=4`);
  check("invalid location rejected", r.status === 400);
  r = await call("GET", `/listings/areas/nearby?lat=${OAU.lat}&lng=${OAU.lng}&radiusKm=10`);
  const areaNames = (r.data.areas || []).map((a) => a.area);
  check("areas near the user listed from real houses", ["Mayfair", "Lagere", "Asherifa", "Modomo", "Damico"].every((a) => areaNames.includes(a)) && !areaNames.includes("Osogbo"));
  check("nearby areas sorted nearest first", r.data.areas.every((a, i) => i === 0 || a.nearestKm >= r.data.areas[i - 1].nearestKm));
  r = await call("GET", `/listings/areas/nearby`);
  check("nearby areas need location", r.status === 400);

  console.log("\nSEARCH & FILTERS");
  r = await call("GET", `/listings?q=${TAG}&electricity24=true`);
  check("filter: 24hrs electricity", same(ids(r.data.listings).sort(), [L1._id, L3._id, L4._id, L5._id].sort()));
  r = await call("GET", `/listings?q=${TAG}&amenities=${encodeURIComponent("24/7 light")}`);
  check("'24/7 light' finds the same houses", r.data.total === 4);
  r = await call("GET", "/listings/amenities");
  check("amenity list starts with 24hrs electricity", r.data.amenities?.[0]?.key === "24hr electricity");
  r = await call("GET", `/listings?q=${TAG}&area=mayfair`);
  check("filter: area", same(ids(r.data.listings), [L1._id]));
  r = await call("GET", `/listings?q=${TAG}&maxDistance=2.5`);
  check("filter: distance from campus", r.data.total > 0 && r.data.listings.every((l) => l.distanceFromCampusKm <= 2.5));
  r = await call("GET", `/listings?q=${TAG}&roomType=self_contained,mini_flat`);
  check("filter: room type", same(ids(r.data.listings).sort(), [L1._id, L5._id].sort()));
  r = await call("GET", `/listings?q=${TAG}&noAgencyFee=true`);
  check("filter: no agency fee", same(ids(r.data.listings), [L5._id]));
  r = await call("GET", `/listings?q=${TAG}&shared=true`);
  check("filter: shared apartment", same(ids(r.data.listings), [L4._id]));
  r = await call("GET", `/listings?q=${TAG}&bedrooms=2`);
  check("filter: number of rooms", same(ids(r.data.listings), [L4._id]));
  r = await call("GET", `/listings/compare?ids=${L1._id},${L2._id},${L5._id}`);
  check("compare listings", r.data.listings?.length === 3 && String(r.data.highlights.cheapest) === String(L2._id));
  r = await call("GET", `/listings/${L4._id}/cost?split=2`);
  check("cost breakdown + split with roommate", r.data.total === 410000 && r.data.perPerson === 205000);

  console.log("\nAVAILABILITY & EXPIRY");
  r = await call("PATCH", `/listings/${L6._id}/status`, { token: agentA, body: { status: "rented" } });
  check("agent marks house rented", r.data.listing?.status === "rented");
  r = await call("GET", `/listings?q=${TAG}`);
  check("rented houses hidden from search", !ids(r.data.listings).includes(L6._id));
  await Listing.updateOne({ _id: L2._id }, { lastConfirmedAt: new Date(Date.now() - 40 * 86400000) });
  await expireOldListings();
  r = await call("GET", `/listings/${L2._id}`);
  check("listing not reconfirmed in 30 days expires", r.data.listing?.status === "expired");
  r = await call("POST", "/inspections", { token: studentA, body: { listing: L2._id, date: new Date(Date.now() + 86400000).toISOString() } });
  check("can't book an expired house", r.status === 400);
  r = await call("PATCH", `/listings/${L2._id}/reconfirm`, { token: agentA });
  check("agent reconfirms → available again", r.data.listing?.status === "available");

  console.log("\nINSPECTIONS");
  r = await call("POST", "/inspections", { token: studentA, body: { listing: L1._id, date: new Date(Date.now() - 86400000).toISOString() } });
  check("can't book in the past", r.status === 400);
  r = await call("POST", "/inspections", { token: studentA, body: { listing: L1._id, date: new Date(Date.now() + 5 * 86400000).toISOString(), note: "Evening please" } });
  check("student books inspection", r.status === 201);
  const inspId = r.data.inspection?._id;
  r = await call("GET", "/inspections/agent?status=pending", { token: agentA });
  check("agent sees the request", r.data.inspections?.some((i) => i._id === inspId));
  r = await call("PATCH", `/inspections/${inspId}/respond`, { token: agentA, body: { action: "propose", proposedDate: new Date(Date.now() + 6 * 86400000).toISOString() } });
  check("agent proposes another time", r.data.inspection?.status === "rescheduled");
  r = await call("PATCH", `/inspections/${inspId}/accept`, { token: studentA });
  check("student accepts proposed time", r.data.inspection?.status === "confirmed");
  r = await call("GET", "/inspections/mine?upcoming=true", { token: studentA });
  check("student views upcoming inspections", r.data.count === 1);

  console.log("\nBOOKMARKS & REVIEWS");
  r = await call("POST", `/bookmarks/${L1._id}`, { token: studentA });
  check("bookmark a house", r.data.bookmarks?.includes(L1._id));
  r = await call("GET", "/bookmarks", { token: studentA });
  check("view favourites", r.data.count === 1);
  r = await call("DELETE", `/bookmarks/${L1._id}`, { token: studentA });
  check("remove bookmark", r.data.bookmarks?.length === 0);
  r = await call("POST", `/listings/${L1._id}/reviews`, { token: studentA, body: { rating: 4, comment: "Good" } });
  check("student reviews house", r.status === 201);
  r = await call("POST", `/listings/${L1._id}/reviews`, { token: studentA, body: { rating: 5 } });
  check("can't review same house twice", r.status === 409);
  r = await call("GET", `/listings/${L1._id}`);
  check("rating updated", r.data.listing?.avgRating === 4);
  r = await call("POST", `/listings/${L1._id}/reviews`, { token: agentA, body: { rating: 5 } });
  check("agents can't review", r.status === 403);

  console.log("\nROOMMATES");
  await call("PUT", "/roommates/me", { token: studentA, body: { budget: 200000, preferredAreas: "modomo", gender: "male", preferredGender: "male", habits: "quiet" } });
  await call("PUT", "/roommates/me", { token: studentB, body: { budget: 190000, preferredAreas: "modomo", gender: "male", habits: "quiet", hasHouse: true, listing: L4._id } });
  await call("PUT", "/roommates/me", { token: studentC, body: { budget: 150000, gender: "female", preferredGender: "female" } });
  r = await call("GET", "/roommates", { token: studentA });
  const mates = (r.data.roommates || []).filter((m) => m.student?.name?.includes(TAG));
  check("finds matching roommate with match score", mates.length === 1 && mates[0].matchScore >= 70);
  check("gender preference respected", mates.every((m) => m.gender === "male"));
  r = await call("DELETE", "/roommates/me", { token: studentA });
  check("opt out (find house alone)", r.status === 200 && (await call("GET", "/roommates/me", { token: studentA })).data.profile === null);

  console.log("\nREPORTS & ADMIN");
  r = await call("POST", "/reports", { token: studentA, body: { listing: L1._id, reason: "wrong_price", details: TAG } });
  check("student reports listing", r.status === 201);
  const reportId = r.data.report?._id;
  r = await call("PATCH", `/admin/reports/${reportId}`, { token: admin, body: { status: "resolved" } });
  check("admin resolves report", r.data.report?.status === "resolved");
  r = await call("GET", "/admin/stats", { token: admin });
  check("admin dashboard stats", r.data.users?.students >= 3);
  r = await call("GET", "/admin/stats", { token: studentA });
  check("students can't see admin routes", r.status === 403);
  const sBId = (await call("GET", "/auth/me", { token: studentB })).data.user._id;
  r = await call("PATCH", `/admin/users/${sBId}/ban`, { token: admin, body: { banned: true } });
  check("admin bans user", r.data.user?.isBanned === true);
  check("banned user blocked immediately", (await call("GET", "/auth/me", { token: studentB })).status === 403);
  r = await call("DELETE", `/admin/listings/${L5._id}`, { token: admin });
  check("admin removes listing", r.status === 200);
  r = await call("GET", `/agents/${agentAId}`);
  check("public agent profile", r.data.isVerified === true);
} catch (err) {
  failed++;
  console.log("\n  ✗ test crashed:", err.message);
} finally {
  // ---------------------------------------------------------------
  console.log("\nCLEANUP");
  const testUsers = await User.find({ email: new RegExp(`\\.${TAG}@nest-test\\.dev$`) });
  const userIds = testUsers.map((u) => u._id);
  const testListings = await Listing.find({ agent: { $in: userIds } });
  testListings.forEach((l) => [...l.photos, ...l.videos].forEach(deleteLocalFile));
  testUsers.forEach((u) => u.agentInfo?.idDocumentUrl && deleteLocalFile(u.agentInfo.idDocumentUrl));
  const listingIds = testListings.map((l) => l._id);
  await Promise.all([
    Listing.deleteMany({ _id: { $in: listingIds } }),
    Inspection.deleteMany({ $or: [{ student: { $in: userIds } }, { agent: { $in: userIds } }] }),
    Review.deleteMany({ $or: [{ student: { $in: userIds } }, { listing: { $in: listingIds } }] }),
    RoommateProfile.deleteMany({ student: { $in: userIds } }),
    Report.deleteMany({ $or: [{ reporter: { $in: userIds } }, { listing: { $in: listingIds } }] }),
    User.deleteMany({ _id: { $in: userIds } }),
  ]);
  const left = await User.countDocuments({ email: new RegExp(`\\.${TAG}@nest-test\\.dev$`) });
  console.log(left === 0 ? `  ✓ removed ${testUsers.length} test users and ${testListings.length} test houses, nothing left behind` : `  ✗ ${left} test users still in the database`);
  await mongoose.disconnect();
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
