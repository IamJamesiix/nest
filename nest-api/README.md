# Nest — Backend

Student off-campus house finder (SWEP project). Node.js + Express 5 + MongoDB.

## Run it

```bash
npm install
# put your MongoDB link in .env (MONGO_URI)
npm run seed      # demo data (wipes the database first)
npm run dev       # http://localhost:5000
npm run test:api  # in a second terminal, checks every feature
```

Demo logins (password for all: `password123`):

| Role | Email |
|---|---|
| Admin | admin@nest.com |
| Verified agent | agent@nest.com, agent2@nest.com |
| Agent waiting for verification | pending@nest.com |
| Student | student@nest.com, amaka@nest.com, daniel@nest.com |

### Google sign-in setup
1. Go to Google Cloud Console → APIs & Services → Credentials → Create credentials → OAuth client ID → **Web application**.
2. Under **Authorized JavaScript origins** add `http://localhost:5173` (and your deployed frontend URL later). No redirect URI is needed.
3. Copy the Client ID into `GOOGLE_CLIENT_ID` in `.env` (backend) and `VITE_GOOGLE_CLIENT_ID` (frontend). Same value for both.

Signing in with Google creates the account on first use (with the role picked on the frontend). If an email/password account with the same email already exists, Google gets linked to it.

Protected routes need the header `Authorization: Bearer <token>` (token comes from login/register).

## Endpoints (all start with `/api`)

### Auth
| Method | Route | Who | Body / notes |
|---|---|---|---|
| POST | /auth/register | anyone | `name, email, password, phone, role: "student" or "agent", businessName?` |
| POST | /auth/login | anyone | `email, password` → `{ token, user }` |
| POST | /auth/google | anyone | `credential` (ID token from the Google button), `role: "student" or "agent"` (only used on first sign-up) → `{ isNew, token, user }` |
| GET | /auth/me | logged in | current user |
| PATCH | /auth/me | logged in | `name, phone, businessName, officeAddress` |

### Agent verification (how we confirm real agents)
| Method | Route | Who | Body / notes |
|---|---|---|---|
| POST | /agents/verification | agent | multipart form: `idType` (nin, drivers_license, voters_card, passport, cac), `idNumber`, `cacNumber?`, file `idDocument` |
| GET | /agents/verification | agent | my status: not_submitted / pending / approved / rejected |
| GET | /agents/:id | anyone | public agent profile, verified badge, rating, listings |

Agents can only create listings after an admin approves them.

### Listings
| Method | Route | Who | Body / notes |
|---|---|---|---|
| GET | /listings | anyone | search + filters (below) |
| GET | /listings/amenities | anyone | standard amenities (for filter checkboxes) + how many houses have each |
| GET | /listings/compare?ids=a,b,c | anyone | 2–4 houses side by side + cheapest/closest/best rated |
| GET | /listings/:id | anyone | listing + full cost breakdown |
| GET | /listings/:id/cost?split=2 | anyone | fee breakdown, total, cost per person if sharing |
| GET | /listings/agent/mine | agent | my listings, with `expiresAt` and `needsReconfirm` |
| POST | /listings | verified agent | see listing fields below |
| PATCH | /listings/:id | owner agent | any listing fields (also counts as reconfirming) |
| DELETE | /listings/:id | owner agent / admin | |
| POST | /listings/:id/photos | owner agent | multipart, field `photos` (up to 8 images, 5MB each) |
| PATCH | /listings/:id/status | owner agent | `status: available / pending / rented` |
| PATCH | /listings/:id/reconfirm | owner agent | "still available" — brings an expired listing back |

**Listing fields:** `title, description, photos[], area, address, lat, lng` (distance from campus is calculated automatically) or `distanceFromCampusKm`, `roomType` (self_contained, single_room, room_and_parlour, mini_flat, flat, shared_apartment, hostel), `bedrooms, bathrooms, isShared, spacesForRoommates, amenities` (array or "water, wifi"), `rent, rentPeriod` (yearly, semester, monthly), `agencyFee, legalFee, cautionFee, serviceCharge, otherFees: [{ name, amount }]`.
`totalCost` is calculated automatically. `updatedAt` = last updated, `lastConfirmedAt` = last confirmed by agent.

**Search filters for GET /listings:**
`maxBudget, minBudget, area` (comma list), `maxDistance` (km), `roomType` (comma list), `bedrooms, minBedrooms, amenities` (comma list, must have all), `electricity24=true` (only houses with 24hrs electricity), `maxAgencyFee, noAgencyFee=true, shared=true|false, rentPeriod, status, q` (text search), `sort` (newest, price_asc, price_desc, distance, rating), `page, limit`.
Expired and rented houses are hidden unless you pass `status`.

**Amenities:** standard keys are `24hr electricity, prepaid meter, water, generator, solar, wifi, security, fenced, tiled, kitchen, wardrobe, parking, pop ceiling, shared toilet`. Different wordings are converted automatically, so "24/7 light", "24 hours electricity" and "constant power" are all saved and searched as `24hr electricity`.

**Expiry:** listings not reconfirmed within `LISTING_EXPIRY_DAYS` (default 30) become `expired` automatically (checked on startup and every hour).

### Reviews
| Method | Route | Who | Body |
|---|---|---|---|
| GET | /listings/:id/reviews | anyone | |
| POST | /listings/:id/reviews | student | `rating (1-5), comment` — one per house |
| PATCH | /listings/:id/reviews | student | edit my review |
| DELETE | /listings/:id/reviews | student | delete my review |

### Inspections
| Method | Route | Who | Body / notes |
|---|---|---|---|
| POST | /inspections | student | `listing, date` (ISO date+time), `note` |
| GET | /inspections/mine?upcoming=true | student | my inspections |
| GET | /inspections/agent?status=pending | agent | requests for my houses |
| PATCH | /inspections/:id/respond | agent | `action: confirm / propose / decline / complete`, `proposedDate` (for propose), `agentNote` |
| PATCH | /inspections/:id/accept | student | accept agent's proposed time |
| PATCH | /inspections/:id/cancel | student or agent | |

### Bookmarks (favourites)
| Method | Route | Who |
|---|---|---|
| GET | /bookmarks | student |
| POST | /bookmarks/:listingId | student |
| DELETE | /bookmarks/:listingId | student |

### Find a roommate (optional — no profile = finding a house alone)
| Method | Route | Who | Body / notes |
|---|---|---|---|
| GET | /roommates?maxBudget=&area=&gender=&hasHouse= | student | sorted by `matchScore` (area, budget, habits, department) |
| GET | /roommates/me | student | my profile (null if not looking) |
| PUT | /roommates/me | student | `budget, preferredAreas, gender, preferredGender, department, level, about, habits, contact, hasHouse, listing` |
| DELETE | /roommates/me | student | stop looking for a roommate |

### Reports
| Method | Route | Who | Body |
|---|---|---|---|
| POST | /reports | logged in | `listing?` or `agent?`, `reason` (fake_listing, wrong_price, already_rented, scam, rude_agent, other), `details` |

### Admin dashboard
| Method | Route | Body / notes |
|---|---|---|
| GET | /admin/stats | counts for the dashboard |
| GET | /admin/users?role=&q= | |
| PATCH | /admin/users/:id/ban | `banned: true / false` |
| GET | /admin/agents?status=pending | agents waiting for verification |
| PATCH | /admin/agents/:id/verify | `approve: true` or `approve: false, reason` |
| GET | /admin/listings?status= | |
| DELETE | /admin/listings/:id | |
| GET | /admin/reports?status=open | |
| PATCH | /admin/reports/:id | `status: resolved / dismissed, adminNote` |

Errors always come back as `{ "message": "..." }` with a proper status code.
