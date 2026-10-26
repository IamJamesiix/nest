import { Router } from "express";
import { myBookmarks, addBookmark, removeBookmark } from "../controllers/bookmarks.js";
import { protect, allow } from "../middleware/auth.js";

const router = Router();
router.use(protect, allow("student"));

router.get("/", myBookmarks);
router.post("/:listingId", addBookmark);
router.delete("/:listingId", removeBookmark);

export default router;
