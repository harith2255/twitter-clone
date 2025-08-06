import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import upload from "../middleware/upload.js";

import {
  getUserProfile,
  followUnfollowUser,
  getSuggestedUsers,
  updateUser,
  bookmarkPost,
} from "../controllers/user.controller.js";

import multer from "multer";

const storage = multer.memoryStorage();

const router = express.Router();

router.get("/profile/:username", protectRoute, getUserProfile);
router.get("/suggested", protectRoute, getSuggestedUsers);
router.post("/follow/:id", protectRoute, followUnfollowUser);
router.patch(
  "/update",
  protectRoute,
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  updateUser
);
router.post("/bookmark/:id", protectRoute, bookmarkPost);

export default router;
