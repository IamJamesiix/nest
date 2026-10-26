import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";

import authRoutes from "./routes/auth.js";
import agentRoutes from "./routes/agents.js";
import listingRoutes from "./routes/listings.js";
import inspectionRoutes from "./routes/inspections.js";
import bookmarkRoutes from "./routes/bookmarks.js";
import roommateRoutes from "./routes/roommates.js";
import reportRoutes from "./routes/reports.js";
import adminRoutes from "./routes/admin.js";
import { notFound, errorHandler } from "./middleware/error.js";

const app = express();

// allow the frontend to load uploaded images
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/uploads", express.static(path.resolve("uploads")));

 app.get("/", (req, res) => {
  res.json({
    app: "Nest API",
    message: "Student off-campus house finder backend is running",
    try: ["/api/health", "/api/listings"],
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "Nest" });
});

app.use("/api/auth", authRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/inspections", inspectionRoutes);
app.use("/api/bookmarks", bookmarkRoutes);
app.use("/api/roommates", roommateRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
