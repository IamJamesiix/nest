import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { fileUrl } from "./helpers.js";

// if CLOUDINARY_URL is in .env, files go to Cloudinary (permanent, good for videos).
// if not, they stay in the local /uploads folder (fine for local dev, gets wiped on Render free).
export const usingCloud = () => Boolean(process.env.CLOUDINARY_URL);

// takes a file multer saved to /uploads, returns the public url
export const saveFile = async (req, file, folder = "misc") => {
  if (!usingCloud()) return fileUrl(req, file);

  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: `nest/${folder}`,
      resource_type: "auto", // works for images, videos and pdfs
    });
    return result.secure_url;
  } finally {
    fs.unlink(file.path, () => {}); // remove the temp copy either way
  }
};

// delete a local upload when it's removed from a listing (cloud files are just unlinked from the listing)
export const deleteLocalFile = (url) => {
  const marker = "/uploads/";
  const i = String(url).indexOf(marker);
  if (i === -1 || String(url).includes("cloudinary")) return;
  const name = String(url).slice(i + marker.length).replace(/[^a-zA-Z0-9._-]/g, "");
  if (name) fs.unlink(`uploads/${name}`, () => {});
};

export const removeTempFiles = (files = []) => {
  for (const f of files) if (f?.path) fs.unlink(f.path, () => {});
};
