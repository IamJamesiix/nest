// deletes ALL data (users, listings, inspections, reviews, roommates, reports). run:
//   npm run db:clear -- --yes
// uses MONGO_URI from .env. there is no undo.
import "dotenv/config";
import mongoose from "mongoose";

if (!process.argv.includes("--yes")) {
  console.log("this deletes EVERYTHING in the database. run again with --yes to confirm:");
  console.log("  npm run db:clear -- --yes");
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);
const names = ["users", "listings", "inspections", "reviews", "roommateprofiles", "reports"];
for (const n of names) {
  const r = await mongoose.connection.db.collection(n).deleteMany({});
  console.log(`  ${n}: deleted ${r.deletedCount}`);
}
console.log(`✅ database cleared (${mongoose.connection.name}). create your admin next: npm run create-admin`);
await mongoose.disconnect();
