import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";
import Post from "../models/post.model.js";
import streamifier from "streamifier";
import Notification from "../models/notification.model.js";
import multer from "multer";
// controllers/userController.js

export const getUserProfile = async (req, res) => {
  try {
    const username = req.params.username;

    const user = await User.findOne({ username }).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });

    const posts = await Post.find({ user: user._id })
      .populate("user", "username fullName profileImg")
      .populate("comments.user", "username profileImg")
      .populate({
        path: "originalPost",
        populate: { path: "user", select: "username fullName profileImg" },
      })
      .sort({ createdAt: -1 });

    res.json({ ...user.toObject(), posts });
  } catch (err) {
    console.error("Error fetching profile:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const followUnfollowUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userToModify = await User.findById(id);
    const currentUser = await User.findById(req.user._id);

    if (id === req.user._id.toString()) {
      return res
        .status(400)
        .json({ error: "You can't follow/unfollow yourself" });
    }

    if (!userToModify || !currentUser)
      return res.status(400).json({ error: "User not found" });

    const isFollowing = currentUser.following.includes(id);

    if (isFollowing) {
      // Unfollow the user
      await User.findByIdAndUpdate(id, { $pull: { followers: req.user._id } });
      await User.findByIdAndUpdate(req.user._id, { $pull: { following: id } });

      res.status(200).json({ message: "User unfollowed successfully" });
    } else {
      // Follow the user
      await User.findByIdAndUpdate(id, { $push: { followers: req.user._id } });
      await User.findByIdAndUpdate(req.user._id, { $push: { following: id } });
      // snd notification to the user
      const newNotification = new Notification({
        type: "follow",
        from: req.user._id,
        to: userToModify._id,
      });
      await newNotification.save();
      //   TODO return the id of the user as a response
      res.status(200).json({ message: "User followed successfully" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error in followUnfollowUser controller", error.message);
  }
};
export const getSuggestedUsers = async (req, res) => {
  try {
    const userId = req.user._id;

    const userFollowedByMe = await User.findById(userId).select("following");
    const users = await User.aggregate([
      {
        $match: {
          _id: { $ne: userId },
        },
      },
      { $sample: { size: 10 } },
    ]);
    const filteredUsers = users.filter(
      (user) => !userFollowedByMe.following.includes(user._id)
    );
    const suggestedUsers = filteredUsers.slice(0, 4);

    suggestedUsers.forEach((user) => (user.password = null));
    res.status(200).json(suggestedUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error in getSuggestedUsers controller", error.message);
  }
};

export const updateUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      fullName,
      email,
      username,
      currentPassword,
      newPassword,
      bio,
      link,
    } = req.body;

    let user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // ✅ Password update validation
    if (
      (currentPassword && !newPassword) ||
      (!currentPassword && newPassword)
    ) {
      return res
        .status(400)
        .json({ error: "Provide both current and new password" });
    }

    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch)
        return res.status(400).json({ error: "Current password is incorrect" });

      if (newPassword.length < 6)
        return res
          .status(400)
          .json({ error: "Password must be at least 6 characters" });

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    // ✅ Upload Helper
    const upload = multer({ storage: multer.memoryStorage() });
    const uploadToCloudinary = (fileBuffer, folder) => {
      return new Promise((resolve, reject) => {
        if (!fileBuffer) return reject(new Error("File buffer missing"));
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
      });
    };

    // ✅ Profile Image Upload
    if (req.files?.profileImage) {
      user.profileImage = req.files.profileImage[0].path;
      user.profileImagePublicId = req.files.profileImage[0].filename;
    }

    if (req.files?.coverImage) {
      user.coverImage = req.files.coverImage[0].path;
      user.coverImagePublicId = req.files.coverImage[0].filename;
    }

    // ✅ Cover Image Upload
    if (req.files?.coverImage && req.files.coverImage[0]?.buffer) {
      if (user.coverImagePublicId) {
        await cloudinary.uploader.destroy(user.coverImagePublicId);
      }
      const result = await uploadToCloudinary(
        req.files.coverImage[0].buffer,
        "twitter-clone/cover"
      );
      user.coverImage = result.secure_url;
      user.coverImagePublicId = result.public_id;
    }

    // ✅ Update text fields
    user.fullName = fullName || user.fullName;
    user.username = username || user.username;
    user.email = email || user.email;
    user.bio = bio || user.bio;
    user.link = link || user.link;

    await user.save();
    user.password = null;

    res.status(200).json(user);
  } catch (error) {
    console.error("Error in updateUser:", error.message);
    res.status(500).json({ error: error.message });
  }
};
export const bookmarkPost = async (req, res) => {
  try {
    const userId = req.user._id;
    const postId = req.params.id; // Make sure your route uses /bookmark/:id

    // ✅ Validate post exists
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ Check if already bookmarked
    const isBookmarked = user.bookmarks.includes(postId);

    if (isBookmarked) {
      // Remove from bookmarks
      user.bookmarks = user.bookmarks.filter((id) => id.toString() !== postId);
    } else {
      // Add to bookmarks
      user.bookmarks.push(postId);
      // ✅ Create notification if user bookmarks another user's post
      if (post.user.toString() !== req.user._id.toString()) {
        await Notification.create({
          from: req.user._id,
          to: post.user,
          type: "bookmark",
          post: postId,
        });
      }
    }

    await user.save();

    res.status(200).json({
      message: isBookmarked
        ? "Post removed from bookmarks"
        : "Post bookmarked successfully",
      bookmarks: user.bookmarks, // Optional: return updated bookmarks
    });
  } catch (error) {
    console.error("Error in bookmarkPost:", error.message);
    res.status(500).json({ error: error.message });
  }
};
