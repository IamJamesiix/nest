import { Router } from "express";
import { requestInspection, myInspections, agentInspections, respondToInspection, acceptProposal, cancelInspection } from "../controllers/inspections.js";
import { protect, allow } from "../middleware/auth.js";

const router = Router();
router.use(protect);

router.post("/", allow("student"), requestInspection);
router.get("/mine", allow("student"), myInspections);
router.get("/agent", allow("agent"), agentInspections);
router.patch("/:id/respond", allow("agent"), respondToInspection);
router.patch("/:id/accept", allow("student"), acceptProposal);
router.patch("/:id/cancel", cancelInspection);

export default router;
