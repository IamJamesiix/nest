# Nest — Backend

Student off-campus house finder (SWEP project). Node.js + Express 5 + MongoDB.

## Run it

```bash
npm install
cp .env.example .env     # then fill in MONGO_URI, JWT_SECRET, GOOGLE_CLIENT_ID (and CLOUDINARY_URL for permanent uploads)
npm run create-admin -- --name "Your Name" --email you@example.com --password "strong-password"
npm run dev              # http://localhost:5000
npm run test:api         # in a second terminal: checks every feature, then deletes all its test data
```

There is **no demo data**. Real students and agents sign up through the app.

| Command | What it does |
|---|---|
| `npm run create-admin -- --name "N" --email e --password p` | creates an admin, or promotes an existing account (`--email` alone is enough to promote, e.g. someone who signed up with Google) |
| `npm run db:clear -- --yes` | deletes **everything** in the database (no undo) |
| `npm run test:api` | 96 checks; uses temporary `@nest-test.dev` accounts and removes them at the end. `API_URL` and `MONGO_URI` must point at the same database |

## Who can be what

- **Student / agent:** chosen at sign-up (`role`). The backend only accepts `student` or `agent`.
- **Admin:** nobody can sign up as admin. Admins are made with `npm run create-admin`, or by an existing admin (`POST /admin/admins`, `PATCH /admin/users/:id/role`). The last admin can't be removed, and an admin can't remove their own admin role.

## Google sign-in setup
1. Google Cloud Console → APIs & Services → Credentials → OAuth client ID → **Web application**.
2. **Authorized JavaScript origins:** `http://localhost:5173` plus your deployed frontend URL.
3. Use the same Client ID in `GOOGLE_CLIENT_ID` (backend) and `VITE_GOOGLE_CLIENT_ID` (frontend).

## File storage (photos, videos, ID documents)
- With `CLOUDINARY_URL` set, files go to Cloudinary and are permanent. **Needed on Render**, where local files are wiped on restart.
- Without it, files are kept in `uploads/` (fine for local development).
- Limits: photos jpg/png/webp up to 5MB (max 15 per listing); videos mp4/mov/webm/3gp up to `MAX_VIDEO_MB` (default 50MB, max 5 per listing); ID documents image/pdf up to 5MB.

Protected routes need `Authorization: Bearer <token>`. Errors are always `{ "message": "..." }`.

## Endpoints (all start with `/api`)

### Auth
| Method | Route | Who | Body / notes |
|---|---|---|---|
| POST | /auth/register | anyone | `name, email, password, phone, role: "student" or "agent", businessName?` |
| POST | /auth/login | anyone | `email, password` → `{ token, user }` |
| POST | /auth/google | anyone | `credential`, `role` (first sign-up only) → `{ isNew, token, user }` |
| GET / PATCH | /auth/me | logged in | get / update `name, phone, businessName, officeAddress` |

### Agent verification
| Method | Route | Who | Body / notes |
|---|---|---|---|
| POST | /agents/verification | agent | multipart: `idType` (nin, drivers_license, voters_card, passport, cac), `idNumber`, `cacNumber?`, file `idDocument` |
| GET | /agents/verification | agent | my status: not_submitted / pending / approved / rejected |
| GET | /agents/:id | anyone | public profile, verified badge, rating, listings |

### Listings
| Method | Route | Who | Notes |
|---|---|---|---|
| GET | /listings | anyone | search (below) |
| GET | /listings/areas/nearby?lat=&lng=&radiusKm=10 | anyone | areas with houses near the user, nearest first: `{ area, houses, nearestKm, cheapestTotal, lat, lng }` |
| GET | /listings/amenities | anyone | standard amenities + counts (24hrs electricity first) |
| GET | /listings/compare?ids=a,b,c | anyone | 2–4 houses side by side |
| GET | /listings/:id | anyone | listing (with `photos`, `videos`) + cost breakdown |
| GET | /listings/:id/cost?split=2 | anyone | fee breakdown, total, per person |
| GET | /listings/agent/mine | agent | my listings + `expiresAt`, `needsReconfirm` |
| POST | /listings | verified agent | listing fields (below) |
| PATCH | /listings/:id | owner | any listing fields |
| DELETE | /listings/:id | owner / admin | |
| POST | /listings/:id/media | owner | multipart: `photos` (up to 8 per upload) and/or `videos` (up to 3 per upload). `/photos` and `/videos` work too |
| DELETE | /listings/:id/media | owner | `{ url }`: remove one photo or video |
| PATCH | /listings/:id/status | owner | `available / pending / rented` |
| PATCH | /listings/:id/reconfirm | owner | brings an expired listing back |

**Listing fields:**
- **Required:** `title`, `roomType`, `rent`, **`lat` + `lng`** (exact GPS of the house) and **`electricity24`** (true/false, compulsory).
- **Optional:** `description, area` (display label), `address, landmark, bedrooms, bathrooms, isShared, spacesForRoommates, amenities, rentPeriod, agencyFee, legalFee, cautionFee, serviceCharge, otherFees: [{ name, amount }]`.
- **Calculated automatically:** `totalCost`, `distanceFromCampusKm`, and the `"24hr electricity"` amenity (kept in sync with `electricity24`).

**Search (GET /listings), all optional:**
- **Near me:** `lat, lng` (or `near=lat,lng`), `radiusKm` (default 5, max 50). Each result gets `distanceFromYouKm`, sorted nearest first.
- **Budget:** `minBudget, maxBudget`. Every house from the minimum up to the maximum, **both included**, sorted cheapest first by default. Swapped values are fixed automatically. `budgetOn=total` (default, the full move-in cost) or `rent`.
- **Other filters:** `electricity24=true`, `hasVideo=true`, `area, maxDistance` (from campus), `roomType, bedrooms, minBedrooms, amenities, maxAgencyFee, noAgencyFee=true, shared, rentPeriod, status, q`.
- **Sort and pages:** `sort` = nearest, price_asc, price_desc, distance, rating, newest. `page, limit` (max 100).
- Every sort has a fixed tie-breaker, so results never change order between requests or pages.

Listings not reconfirmed within `LISTING_EXPIRY_DAYS` (default 30) become `expired` and are hidden from search.

### Reviews · Inspections · Bookmarks · Roommates · Reports
| Method | Route | Who |
|---|---|---|
| GET / POST / PATCH / DELETE | /listings/:id/reviews | anyone reads; students write (`rating 1-5, comment`) |
| POST | /inspections | student: `listing, date, note` |
| GET | /inspections/mine?upcoming=true | student |
| GET | /inspections/agent?status= | agent |
| PATCH | /inspections/:id/respond | agent: `action: confirm / propose / decline / complete`, `proposedDate`, `agentNote` |
| PATCH | /inspections/:id/accept · /:id/cancel | student accepts proposal · either cancels |
| GET · POST · DELETE | /bookmarks · /bookmarks/:listingId | student |
| GET | /roommates?maxBudget=&area=&gender=&hasHouse= | student, sorted by `matchScore` |
| GET · PUT · DELETE | /roommates/me | student (no profile = finding a house alone) |
| POST | /reports | logged in: `listing? / agent?, reason, details` |

### Admin
| Method | Route | Body / notes |
|---|---|---|
| GET | /admin/stats | dashboard counts |
| POST | /admin/admins | `name, email, password`: add an admin (or promote that email) |
| GET | /admin/users?role=&q= | |
| PATCH | /admin/users/:id/role | `role: student / agent / admin` |
| PATCH | /admin/users/:id/ban | `banned: true / false` |
| GET | /admin/agents?status=pending | |
| PATCH | /admin/agents/:id/verify | `approve: true` or `approve: false, reason` |
| GET · DELETE | /admin/listings · /admin/listings/:id | |
| GET · PATCH | /admin/reports · /admin/reports/:id | `status: resolved / dismissed, adminNote` |
