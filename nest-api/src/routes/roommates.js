import { Router } from "express";
import { upsertMyProfile, getMyProfile, deleteMyProfile, findRoommates } from "../controllers/roommates.js";
import { protect, allow } from "../middleware/auth.js";

const router = Router();
router.use(protect, allow("student"));

router.get("/", findRoommates);
router.get("/me", getMyProfile);
router.put("/me", upsertMyProfile);
router.delete("/me", deleteMyProfile);

export default router;
