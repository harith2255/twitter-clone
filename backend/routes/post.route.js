import express from "express";
import upload from "../middleware/upload.js";
import protectRoute from "../middleware/protectRoute.js";
import {
  createPost,
  deletePost,
  commentOnPost,
  likeUnlikePosts,
  getAllPosts,
  getLikedPosts,
  getFollowingPosts,
  getUserPosts,
  retweetPost,
} from "../controllers/post.controller.js";

const router = express.Router();

router.get("/all", protectRoute, getAllPosts);
router.get("/likes/:id", protectRoute, getLikedPosts);
router.get("/user/:username", protectRoute, getUserPosts);
router.get("/following", protectRoute, getFollowingPosts);
router.post("/create", upload.single("image"), protectRoute, createPost);
router.post("/like/:id", protectRoute, likeUnlikePosts);
router.post("/comment/:id", protectRoute, commentOnPost);
router.delete("/:id", protectRoute, deletePost);
router.post("/retweet/:id", protectRoute, retweetPost);

export default router;
