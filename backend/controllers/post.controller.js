import Notification from "../models/notification.model.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";

import cloudinary from "../config/cloudinary.js";
// ✅ CREATE POST
export const createPost = async (req, res) => {
  try {
    const { text } = req.body;
    let imgUrl = null;

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "twitter_clone/posts",
      });
      imgUrl = result.secure_url;
    }

    const newPost = await Post.create({
      user: req.user._id,
      text,
      img: imgUrl,
    });

    const populatedPost = await newPost.populate(
      "user",
      "fullName username profileImg"
    );

    res.status(201).json({ post: populatedPost });
  } catch (error) {
    console.error("Error in createPost:", error.message);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// ✅ DELETE POST
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.user.toString() !== req.user._id.toString())
      return res.status(401).json({ message: "Unauthorized" });

    if (post.img) {
      const publicId = post.img.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`twitter_clone/posts/${publicId}`);
    }
    // If this is a retweet, remove user from original post's retweet list
    if (post.type === "retweet" && post.originalPost) {
      await Post.findByIdAndUpdate(post.originalPost, {
        $pull: { retweets: req.user._id },
      });
    }

    await Post.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error in deletePost:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const commentOnPost = async (req, res) => {
  try {
    const { text } = req.body;
    const postId = req.params.id;
    const userId = req.user._id;

    if (!text) {
      return res.status(400).json({ message: "Please provide comment text" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = {
      user: userId,
      text,
    };

    post.comments.push(comment);
    await post.save();

    res.status(200).json({ message: "Comment added successfully", post });
  } catch (error) {
    console.error("Error in commentOnPost controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const likeUnlikePosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id: postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const userLikedPost = post.likes.includes(userId);

    if (userLikedPost) {
      // Unlike post
      await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
      await User.updateOne({ _id: userId }, { $pull: { likedPosts: postId } });

      return res.status(200).json({ message: "Post unliked successfully" });
    }

    // Like post
    post.likes.push(userId);
    await post.save();
    await User.updateOne({ _id: userId }, { $push: { likedPosts: postId } });

    // Create notification for like
    if (post.user.toString() !== userId.toString()) {
      const notification = new Notification({
        from: userId,
        to: post.user,
        type: "like",
      });
      await notification.save();
    }

    return res.status(200).json({ message: "Post liked successfully" });
  } catch (error) {
    console.error("Error in likeUnlikePosts controller:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("user", "username fullName profileImg") // Post author
      .populate("comments.user", "username profileImg") // Comment author
      .populate({
        path: "originalPost",
        populate: {
          path: "user",
          select: "username fullName profileImg",
        },
      });
    res.status(200).json(posts);
  } catch (error) {
    console.error("Error in getAllPosts controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const getLikedPosts = async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const likedPosts = await Post.find({
      _id: { $in: user.likedPosts },
    })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });
    res.status(200).json(likedPosts);
  } catch (error) {
    console.error("Error in getLikedPosts controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const getFollowingPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const following = user.following;

    const feedPosts = await Post.find({ user: { $in: following } })
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });

    res.status(200).json(feedPosts);
  } catch (error) {
    console.log("Error in getFollowingPosts controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const getUserPosts = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });

    const posts = await Post.find({ user: user._id })
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });

    res.status(200).json(posts);
  } catch (error) {
    console.error("Error in getUserPosts controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const retweetPost = async (req, res) => {
  try {
    const { id } = req.params; // original post ID
    const userId = req.user._id;

    const originalPost = await Post.findById(id);
    if (!originalPost) {
      return res.status(404).json({ error: "Original post not found" });
    }

    // Check if user already retweeted
    const existingRetweet = await Post.findOne({
      user: userId,
      type: "retweet",
      originalPost: id,
    });

    if (existingRetweet) {
      // If already retweeted, delete the retweet
      await Post.findByIdAndDelete(existingRetweet._id);

      // Remove from retweets array of original post
      originalPost.retweets = originalPost.retweets.filter(
        (uid) => uid.toString() !== userId.toString()
      );
      await originalPost.save();

      return res.json({ message: "Retweet removed" });
    }

    // Create new retweet
    const newRetweet = new Post({
      user: userId,
      type: "retweet",
      originalPost: id,
    });

    await newRetweet.save();

    // Add retweet reference to original post
    originalPost.retweets.push(userId);
    await originalPost.save();

    res.json({ message: "Retweeted successfully", retweet: newRetweet });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};
