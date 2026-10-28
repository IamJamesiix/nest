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

## First-time setup (no demo data)

The backend has no seed data or demo accounts. Create the first admin from the backend folder:

```bash
cd nest-api
npm run create-admin -- --name "Your Name" --email you@example.com --password yourpassword
```

Then sign in with that email on the normal login page. More admins can be added from **Admin → Admins & roles**.

Agents and students sign up themselves on the Register page (email/password or Google).

## Maps and location

- Maps use Leaflet with OpenStreetMap tiles, so no API key is needed.
- Students' location comes from the browser's GPS. It works on `localhost` and on `https` (Vercel), and it's kept in memory only, never saved.
- Agents pin each house on a map (or use "I'm at the house"). The area name is filled from OpenStreetMap and can be edited.

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

Do this once before presenting so there's real data to show:

1. Create an admin with `npm run create-admin` (above).
2. Register an agent. Send an ID on the Verification page, then approve it as the admin.
3. As the agent, create 3 or 4 listings. For each one:
   - use "I'm at the house" or drop the pin
   - answer the 24hrs electricity question
   - add at least one photo
   - add a short video tour on one of them
4. Register a student account.

During the presentation:

1. **Student.**
   - Open Browse and click **Use my location**. Point out "Located within X m" and the "km from you" on each card.
   - Change the distance radius, tap an area chip, then tap **24hrs Electricity**.
   - Set a budget range and show the "Showing N houses from ₦… to ₦…" line.
   - Switch to **Map** view.
   - Open a house: play the video tour, split the cost, then book an inspection.
2. **Agent.**
   - Create a listing live. Show the GPS pin, the area filled from the map, and the required electricity question.
   - Upload a video and point out the progress bar.
   - Answer the student's inspection request.
3. **Admin.**
   - Show the stats.
   - Approve an agent.
   - Open **Admins & roles** and add an admin.
   - Change a user's role.

## If something goes wrong during the demo

- **"Can't reach the server"**: the backend isn't running. Start `npm run dev` in `nest-api`.
- **Map tiles don't show**: they come from OpenStreetMap and need internet. Pins and distances still work.
- **"Use my location" does nothing**: the browser blocked location. Allow it in the address bar, or use **Drop a pin**.
- **Stuck logged in as the wrong user**: click Log out, or clear the site data in the browser.
