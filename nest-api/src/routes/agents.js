import { Router } from "express";
import { submitVerification, myVerification, agentProfile } from "../controllers/agents.js";
import { protect, allow } from "../middleware/auth.js";
import { uploadDocument } from "../middleware/upload.js";

const router = Router();

router.post("/verification", protect, allow("agent"), uploadDocument.single("idDocument"), submitVerification);
router.get("/verification", protect, allow("agent"), myVerification);
router.get("/:id", agentProfile);

export default router;
