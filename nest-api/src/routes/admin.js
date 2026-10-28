import { Router } from "express";
import { stats, listUsers, banUser, listAgents, verifyAgent, listAllListings, removeListing, listReports, updateReport, addAdmin, changeRole } from "../controllers/admin.js";
import { protect, allow } from "../middleware/auth.js";

const router = Router();
router.use(protect, allow("admin"));

router.get("/stats", stats);
router.get("/users", listUsers);
router.patch("/users/:id/ban", banUser);
router.patch("/users/:id/role", changeRole);
router.post("/admins", addAdmin);
router.get("/agents", listAgents);
router.patch("/agents/:id/verify", verifyAgent);
router.get("/listings", listAllListings);
router.delete("/listings/:id", removeListing);
router.get("/reports", listReports);
router.patch("/reports/:id", updateReport);

export default router;
