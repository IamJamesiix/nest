import multer from "multer";
import path from "path";
import fs from "fs";
import { AppError } from "../utils/helpers.js";

fs.mkdirSync("uploads", { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, "");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/3gpp"];
export const MAX_IMAGE_MB = 5;
export const MAX_VIDEO_MB = Number(process.env.MAX_VIDEO_MB || 50);

// agent ID documents: images or pdf, 5MB
export const uploadDocument = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if ([...IMAGE_TYPES, "application/pdf"].includes(file.mimetype)) cb(null, true);
    else cb(new AppError("ID document must be a jpg, png, webp or pdf file", 400));
  },
});

// listing media: photos (5MB each) and videos (MAX_VIDEO_MB each)
// multer only has one size limit, so it's set to the video limit and the controller checks photo size
export const uploadMedia = multer({
  storage,
  limits: { fileSize: MAX_VIDEO_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "photos" && IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
    if (file.fieldname === "videos" && VIDEO_TYPES.includes(file.mimetype)) return cb(null, true);
    if (file.fieldname === "photos") return cb(new AppError("Photos must be jpg, png or webp", 400));
    if (file.fieldname === "videos") return cb(new AppError("Videos must be mp4, mov, webm or 3gp", 400));
    cb(new AppError(`Unexpected file field "${file.fieldname}". Use "photos" or "videos".`, 400));
  },
}).fields([
  { name: "photos", maxCount: 8 },
  { name: "videos", maxCount: 3 },
]);
