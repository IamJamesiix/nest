// create the first admin (or promote an existing account). run:
//   npm run create-admin -- --name "Festus" --email you@gmail.com --password "a-strong-password"
// to promote an account that already exists (e.g. signed up with Google), only --email is needed.
// it uses the database in your .env (MONGO_URI). for the live database, put the Atlas link there first.
import "dotenv/config";
import mongoose from "mongoose";
import { createOrPromoteAdmin } from "../src/utils/admin.js";

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
};

const name = arg("--name");
const email = arg("--email");
const password = arg("--password");

if (!email) {
  console.log('usage: npm run create-admin -- --name "Your Name" --email you@example.com --password "strong-password"');
  process.exit(1);
}
if (password && password.length < 8) {
  console.log("use a password of at least 8 characters for an admin");
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGO_URI);
  const { user, created } = await createOrPromoteAdmin({ name, email, password });
  console.log(created ? `✅ admin created: ${user.email}` : `✅ ${user.email} is now an admin`);
} catch (err) {
  console.log("❌", err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
