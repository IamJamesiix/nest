// quick check that every feature works. start the server first, then run:  npm run test:api
// (run "npm run seed" before this so the demo accounts exist)
const BASE = process.env.API_URL || "http://localhost:5000/api";
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

const login = async (email) => (await call("POST", "/auth/login", { body: { email, password: "password123" } })).data.token;

console.log("\nAUTH");
let r = await call("POST", "/auth/register", { body: { name: "Test Student", email: `s${Date.now()}@test.com`, password: "secret123", role: "student" } });
check("student can register", r.status === 201 && r.data.token);
r = await call("POST", "/auth/register", { body: { name: "Test Agent", email: `a${Date.now()}@test.com`, password: "secret123", role: "agent", businessName: "Test Homes" } });
check("agent can register", r.status === 201 && r.data.user.agentInfo.verificationStatus === "not_submitted");
const newAgentToken = r.data.token;
const newAgentId = r.data.user._id;
r = await call("POST", "/auth/register", { body: { name: "Sneaky", email: `x${Date.now()}@test.com`, password: "secret123", role: "admin" } });
check("nobody can register as admin", r.status === 400);
r = await call("POST", "/auth/login", { body: { email: "student@nest.com", password: "wrong" } });
check("wrong password rejected", r.status === 401);

const student = await login("student@nest.com");
const agent = await login("agent@nest.com");
const admin = await login("admin@nest.com");
check("demo accounts log in", student && agent && admin);
r = await call("GET", "/auth/me", { token: student });
check("GET /auth/me works", r.data.user?.email === "student@nest.com");

console.log("\nAGENT VERIFICATION");
r = await call("POST", "/listings", { token: newAgentToken, body: { title: "x", area: "y", roomType: "single_room", rent: 1 } });
check("unverified agent can't post listing", r.status === 403);
const form = new FormData();
form.append("idType", "nin");
form.append("idNumber", "98765432100");
form.append("idDocument", new Blob([Buffer.from("fakepng")], { type: "image/png" }), "id.png");
r = await call("POST", "/agents/verification", { token: newAgentToken, form });
check("agent submits ID for verification", r.status === 200 && r.data.agentInfo.verificationStatus === "pending");
r = await call("GET", "/admin/agents?status=pending", { token: admin });
check("admin sees pending agents", r.data.count >= 1);
r = await call("PATCH", `/admin/agents/${newAgentId}/verify`, { token: admin, body: { approve: true } });
check("admin approves agent", r.data.agent?.agentInfo.verificationStatus === "approved");

console.log("\nLISTINGS");
r = await call("POST", "/listings", { token: newAgentToken, body: { title: "Test self-con", area: "Mayfair", roomType: "self_contained", rent: 150000, agencyFee: 15000, legalFee: 5000, otherFees: [{ name: "Water", amount: 2000 }], amenities: "water, wifi", lat: 7.5, lng: 4.53 } });
check("verified agent creates listing", r.status === 201);
check("total cost auto-calculated (172000)", r.data.listing?.totalCost === 172000, `got ${r.data.listing?.totalCost}`);
check("distance auto-calculated from lat/lng", typeof r.data.listing?.distanceFromCampusKm === "number");
const myListingId = r.data.listing?._id;
r = await call("PATCH", `/listings/${myListingId}`, { token: agent, body: { rent: 1 } });
check("agent can't edit someone else's listing", r.status === 403);
r = await call("PATCH", `/listings/${myListingId}`, { token: newAgentToken, body: { rent: 160000 } });
check("agent edits own listing, total updates", r.data.listing?.totalCost === 182000, `got ${r.data.listing?.totalCost}`);
const pform = new FormData();
pform.append("photos", new Blob([Buffer.from("img")], { type: "image/jpeg" }), "a.jpg");
pform.append("photos", new Blob([Buffer.from("img")], { type: "image/jpeg" }), "b.jpg");
r = await call("POST", `/listings/${myListingId}/photos`, { token: newAgentToken, form: pform });
check("upload listing photos", r.data.photos?.length === 2);
r = await call("PATCH", `/listings/${myListingId}/status`, { token: newAgentToken, body: { status: "pending" } });
check("agent updates availability", r.data.listing?.status === "pending");
r = await call("GET", "/listings/agent/mine", { token: newAgentToken });
check("agent sees own listings with expiry date", r.data.count === 1 && r.data.listings[0].expiresAt);

console.log("\nSEARCH & FILTERS");
r = await call("GET", "/listings");
check("browse listings (no login needed)", r.data.total > 0);
check("expired + rented hidden by default", r.data.listings.every((l) => ["available", "pending"].includes(l.status)));
r = await call("GET", "/listings?maxBudget=150000");
check("filter: max budget", r.data.listings.every((l) => l.totalCost <= 150000) && r.data.total > 0);
r = await call("GET", "/listings?area=mayfair");
check("filter: area", r.data.total > 0 && r.data.listings.every((l) => /mayfair/i.test(l.area)));
r = await call("GET", "/listings?maxDistance=2.5");
check("filter: distance from campus", r.data.listings.every((l) => l.distanceFromCampusKm <= 2.5));
r = await call("GET", "/listings?roomType=self_contained,mini_flat");
check("filter: room type", r.data.listings.every((l) => ["self_contained", "mini_flat"].includes(l.roomType)));
r = await call("GET", "/listings?amenities=water,prepaid meter");
check("filter: amenities", r.data.total > 0 && r.data.listings.every((l) => l.amenities.includes("prepaid meter")));
r = await call("GET", "/listings?noAgencyFee=true");
check("filter: no agency fee", r.data.total > 0 && r.data.listings.every((l) => l.agencyFee === 0));
r = await call("GET", "/listings?shared=true");
check("filter: shared apartment", r.data.total > 0 && r.data.listings.every((l) => l.isShared));
r = await call("GET", "/listings?bedrooms=2");
check("filter: number of rooms", r.data.listings.every((l) => l.bedrooms === 2));
r = await call("GET", "/listings?sort=price_asc");
const prices = r.data.listings.map((l) => l.totalCost);
check("sort by cheapest", prices.every((p, i) => i === 0 || p >= prices[i - 1]));
r = await call("GET", "/listings?status=expired");
check("old listing auto-expired", r.data.total >= 1);
const expiredId = r.data.listings[0]?._id;
const all = (await call("GET", "/listings?sort=price_asc")).data.listings;
const ids = all.slice(0, 3).map((l) => l._id);
r = await call("GET", `/listings/compare?ids=${ids.join(",")}`);
check("compare listings", r.data.listings?.length === 3 && r.data.highlights.cheapest === ids[0]);
const sharedListing = (await call("GET", "/listings?shared=true&roomType=shared_apartment")).data.listings[0];
r = await call("GET", `/listings/${sharedListing._id}/cost?split=2`);
check("cost breakdown + split with roommate", r.data.items?.length > 1 && r.data.perPerson === Math.ceil(r.data.total / 2));
r = await call("GET", `/listings/${ids[0]}`);
check("single listing with cost breakdown", r.data.listing && r.data.costBreakdown?.total === r.data.listing.totalCost);

console.log("\nINSPECTIONS");
const target = all.find((l) => String(l.agent._id || l.agent) !== newAgentId && l.status === "available");
r = await call("POST", "/inspections", { token: student, body: { listing: target._id, date: new Date(Date.now() - 86400000).toISOString() } });
check("can't book in the past", r.status === 400);
r = await call("POST", "/inspections", { token: student, body: { listing: target._id, date: new Date(Date.now() + 5 * 86400000).toISOString(), note: "Evening please" } });
check("student books inspection", r.status === 201 || r.status === 409, `status ${r.status} ${r.data.message}`);
r = await call("POST", "/inspections", { token: student, body: { listing: expiredId, date: new Date(Date.now() + 86400000).toISOString() } });
check("can't book an expired house", r.status === 400);
const agentToken = String(target.agent._id) === (await call("GET", "/auth/me", { token: agent })).data.user._id ? agent : await login("agent2@nest.com");
r = await call("GET", "/inspections/agent?status=pending", { token: agentToken });
check("agent sees inspection requests", r.data.count >= 1);
const insp = r.data.inspections.find((i) => String(i.listing._id) === String(target._id));
r = await call("PATCH", `/inspections/${insp._id}/respond`, { token: agentToken, body: { action: "propose", proposedDate: new Date(Date.now() + 6 * 86400000).toISOString(), agentNote: "Next day better" } });
check("agent proposes another time", r.data.inspection?.status === "rescheduled");
r = await call("PATCH", `/inspections/${insp._id}/accept`, { token: student });
check("student accepts proposed time", r.data.inspection?.status === "confirmed");
r = await call("GET", "/inspections/mine?upcoming=true", { token: student });
check("student views upcoming inspections", r.data.count >= 1);

console.log("\nBOOKMARKS");
r = await call("POST", `/bookmarks/${ids[1]}`, { token: student });
check("bookmark a house", r.data.bookmarks?.some((b) => String(b) === String(ids[1])));
r = await call("GET", "/bookmarks", { token: student });
check("view favourites", r.data.count >= 1);
r = await call("DELETE", `/bookmarks/${ids[1]}`, { token: student });
check("remove bookmark", !r.data.bookmarks?.some((b) => String(b) === String(ids[1])));
r = await call("POST", `/bookmarks/${ids[1]}`, { token: agent });
check("agents can't bookmark", r.status === 403);

console.log("\nREVIEWS");
r = await call("POST", `/listings/${myListingId}/reviews`, { token: student, body: { rating: 4, comment: "Good" } });
check("student reviews house", r.status === 201);
r = await call("POST", `/listings/${myListingId}/reviews`, { token: student, body: { rating: 5 } });
check("can't review same house twice", r.status === 409);
r = await call("GET", `/listings/${myListingId}`);
check("listing rating updated", r.data.listing?.avgRating === 4 && r.data.listing.reviewCount === 1);
r = await call("POST", `/listings/${myListingId}/reviews`, { token: agent, body: { rating: 5 } });
check("agents can't review", r.status === 403);

console.log("\nROOMMATES");
r = await call("GET", "/roommates", { token: student });
check("find roommates with match score", r.data.count >= 1 && typeof r.data.roommates[0].matchScore === "number");
check("gender preference respected", r.data.roommates.every((p) => p.gender === "male"));
r = await call("PUT", "/roommates/me", { token: student, body: { budget: 210000, habits: "quiet, non-smoker, gym" } });
check("update my roommate profile", r.data.profile?.budget === 210000);
r = await call("DELETE", "/roommates/me", { token: student });
check("opt out (find house alone)", r.status === 200);
r = await call("GET", "/roommates/me", { token: student });
check("profile gone", r.data.profile === null);

console.log("\nREPORTS & ADMIN");
r = await call("POST", "/reports", { token: student, body: { listing: ids[0], reason: "scam", details: "test" } });
check("student reports listing", r.status === 201);
r = await call("GET", "/admin/stats", { token: admin });
check("admin dashboard stats", r.data.users?.students >= 1);
r = await call("GET", "/admin/stats", { token: student });
check("students can't see admin routes", r.status === 403);
r = await call("GET", "/admin/reports?status=open", { token: admin });
check("admin sees reports", r.data.count >= 1);
r = await call("PATCH", `/admin/reports/${r.data.reports[0]._id}`, { token: admin, body: { status: "resolved", adminNote: "checked" } });
check("admin resolves report", r.data.report?.status === "resolved");
r = await call("GET", "/admin/users?role=student", { token: admin });
const victim = r.data.users.find((u) => u.email.startsWith("s"));
r = await call("PATCH", `/admin/users/${victim._id}/ban`, { token: admin, body: { banned: true } });
check("admin bans user", r.data.user?.isBanned === true);
r = await call("DELETE", `/admin/listings/${myListingId}`, { token: admin });
check("admin removes listing", r.status === 200);
r = await call("GET", "/agents/" + newAgentId);
check("public agent profile", r.data.isVerified === true);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
