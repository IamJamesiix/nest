# Nest — frontend

React + Vite + Tailwind frontend for Nest, the off-campus house finder for OAU students.

## Run it (Mac)

You need Node 18 or newer (`node -v`).

```bash
# 1. put this folder next to the backend
#    Nest/
#    ├── nest-api/
#    └── nest-web/   <- this folder

# 2. start the backend (terminal 1)
cd Nest/nest-api
npm run seed        # fresh demo data
npm run dev         # http://localhost:5000

# 3. start the frontend (terminal 2)
cd Nest/nest-web
npm install
npm run dev         # http://localhost:5173
```

`.env` already points at the API. For Google sign-in, paste your client ID:

```
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=<same value as GOOGLE_CLIENT_ID in nest-api/.env>
```

Without a client ID the app still works; the Google button is replaced by a short note.
In Google Cloud Console, the OAuth client must list `http://localhost:5173` under Authorized JavaScript origins.

If you change `.env`, stop and restart `npm run dev`.

### Creating it from scratch (for reference)

This is how the project was set up, in case you're asked:

```bash
npm create vite@latest nest-web -- --template react
cd nest-web
npm install react-router-dom axios
npm install -D tailwindcss @tailwindcss/vite
```

Then add `tailwindcss()` to the plugins in `vite.config.js` and `@import "tailwindcss";` at the top of `src/index.css`.

## Dark mode

The sun/moon button in the navbar (and at the top of the dashboard sidebar) switches themes.
Nest follows the device's light/dark setting until someone picks one, then remembers it.

## Demo accounts

Password for all: `password123`. The login page has buttons that fill these in.

| Role | Email |
|---|---|
| Admin | admin@nest.com |
| Verified agent | agent@nest.com, agent2@nest.com |
| Agent waiting for verification | pending@nest.com |
| Student | student@nest.com, amaka@nest.com, daniel@nest.com |

## Folder guide

```
src/
├── api/client.js          axios instance, adds the token, logs out on 401
├── context/               AuthContext, CompareContext, ToastContext
├── components/            Navbar, layouts + role guards, ListingCard, CampusMap, ReportModal, ui.jsx
├── utils/format.js        ₦ formatting, labels for enums, dates
└── pages/
    ├── Home, Browse, ListingDetails, Compare, AgentProfile, Auth, NotFound
    ├── student/           MyInspections, Favourites, Roommates
    ├── agent/             AgentDashboard, ListingForm, AgentInspections, Verification
    └── admin/             AdminOverview, AdminAgents, AdminUsers, AdminListings, AdminReports
```

## Demo script (about 8 minutes)

Run `npm run seed` right before presenting so the data is clean.

### 1. The problem (30 seconds)
"Finding a house around OAU means walking around with agents, hidden fees showing up at the last minute, and houses that were rented weeks ago still being advertised. Nest fixes that."

### 2. Student flow (3 minutes)
1. Open the **home page**. Point out the campus map with price pins, and the search bar.
2. Search **Max total budget ₦250,000**. On Browse, show the filters: tick **Lagere** and **Mayfair**, then sort by **Closest to campus**. Clear filters.
3. Tick **Add to compare** on three houses, click **Compare** in the bar at the bottom. Show the cheapest, closest and best rated tags.
4. Open a house. Show the photos, the **Confirmed X days ago** label, and the **Verified agent** badge.
5. In the **cost breakdown**, change **Split with** to 2 people. "Every fee is shown before you go, and you can see your share."
6. Sign in as **student@nest.com** (use the Student button on the login page).
7. Back on the house: **Save** it, then pick a day and time and click **Request**. You land on **My inspections**.
8. Open **Roommates**. Show the match scores, then **Edit profile** to show budget, areas and habits.
9. Mention **Report**: any user can flag a scam or wrong price.

### 3. Agent flow (2.5 minutes)
1. Log out, sign in as **agent@nest.com**.
2. Dashboard: show the **reconfirm warning** for the old listing. Click **Still accurate, reconfirm**. "Listings expire after 30 days unless the agent confirms they're still available."
3. Change a listing's status with the dropdown (Available, Pending, Rented).
4. **Inspection requests**: click **Propose new time** on the new request from the student, and send it.
5. **Create listing**: fill title, area, rent and fees. Point at the live **What students will see** total. Add a photo and publish.
6. Log out, sign in as **pending@nest.com**. Show that an unverified agent sees the verification banner and can't create listings.

### 4. Back to the student (30 seconds)
Sign in as **student@nest.com**, open **My inspections**, and click **Accept new time**.

### 5. Admin flow (1.5 minutes)
1. Sign in as **admin@nest.com**. Show the stats cards.
2. **Agent verification**: click **View ID** on Kola Bello, then **Approve**. "Now his houses show the Verified badge."
3. **Reports**: open the wrong price report, **Resolve** it with a note.
4. **Users**: search a name, show **Ban** and **Unban**.
5. **All listings**: show that admins can remove any listing.

### 6. Close (30 seconds)
"Verified agents, the full cost upfront, listings that stay current, and inspections booked in the app. That's Nest."

## If something goes wrong during the demo

- **"Can't reach the server"**: the backend isn't running. Start `npm run dev` in `nest-api`.
- **Photos don't show**: seed photos come from picsum.photos and need internet. Without it, Nest shows a drawn house instead, so the demo still works.
- **Stuck logged in as the wrong user**: click Log out, or clear the site data in the browser.
- **Data got messy after practising**: run `npm run seed` in `nest-api` again.
