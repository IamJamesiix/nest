import { Router } from "express";
import { register, login, googleAuth, me, updateMe } from "../controllers/auth.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleAuth);
router.get("/me", protect, me);
router.patch("/me", protect, updateMe);

export default router;
