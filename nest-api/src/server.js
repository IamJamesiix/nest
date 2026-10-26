import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";
import { startExpiryJob } from "./jobs/expireListings.js";

const PORT = process.env.PORT || 5000;

await connectDB();
startExpiryJob();

app.listen(PORT, () => {
  console.log(`Nest backend running on http://localhost:${PORT}`);
});
