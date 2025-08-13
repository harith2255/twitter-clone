import { FaRegComment } from "react-icons/fa";
import { BiRepost } from "react-icons/bi";
import { FaRegHeart } from "react-icons/fa";
import { FaRegBookmark, FaBookmark } from "react-icons/fa6";
import { FaTrash } from "react-icons/fa";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import LoadingSpinner from "./LoadingSpinner";
import { formatPostDate } from "../../utils/date";

const Post = ({ post }) => {
  const [comment, setComment] = useState("");
  const { data: authUser } = useQuery({ queryKey: ["authUser"] });
  const queryClient = useQueryClient();

  const isRetweet = post.type === "retweet";
  const postOwner = post.user;
  const isLiked = authUser ? post.likes.includes(authUser._id) : false;
  const isRetweeted = authUser ? post.retweets?.includes(authUser._id) : false;
  const isMyPost = authUser && authUser._id === postOwner._id;
  const formattedDate = formatPostDate(post.createdAt);
  const isBookmarked = authUser?.bookmarks?.includes(post._id);

  /** ================= DELETE POST ================= **/
  const { mutate: deletePost, isPending: isDeleting } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/posts/${post._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      return data;
    },
    onSuccess: () => {
      toast.success("Post deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (error) => toast.error(error.message),
  });

  /** ================= LIKE POST ================= **/
  const { mutate: likePost, isPending: isLiking } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/posts/like/${post._id}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      return data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      const previousPosts = queryClient.getQueryData(["posts"]);
      if (!previousPosts) return { previousPosts };

      queryClient.setQueryData(["posts"], (oldPosts) =>
        oldPosts.map((p) =>
          p._id === post._id
            ? {
                ...p,
                likes: isLiked
                  ? p.likes.filter((id) => id !== authUser._id)
                  : [...p.likes, authUser._id],
              }
            : p
        )
      );

      return { previousPosts };
    },
    onError: (error, _, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(["posts"], context.previousPosts);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  /** ================= COMMENT ================= **/
  const { mutate: commentPost, isPending: isCommenting } = useMutation({
    mutationFn: async (commentText) => {
      const res = await fetch(`/api/posts/comment/${post._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: commentText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      return data;
    },
    onSuccess: () => {
      toast.success("Comment posted successfully");
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const handlePostComment = (e) => {
    e.preventDefault();
    if (!isCommenting && comment.trim()) {
      commentPost(comment);
    }
  };

  /** ================= RETWEET ================= **/
  const { mutate: retweetPost, isPending: isRetweeting } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/posts/retweet/${post._id}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      return data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      const previousPosts = queryClient.getQueryData(["posts"]);
      if (!previousPosts) return { previousPosts };

      queryClient.setQueryData(["posts"], (oldPosts) =>
        oldPosts.map((p) =>
          p._id === post._id
            ? {
                ...p,
                retweets: isRetweeted
                  ? p.retweets.filter((id) => id !== authUser._id)
                  : [...p.retweets, authUser._id],
              }
            : p
        )
      );

      return { previousPosts };
    },
    onError: (error, _, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(["posts"], context.previousPosts);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onSuccess: (data) => {
      toast.success(data.message || "Retweet updated");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  /** ================= BOOKMARK ================= **/
  const { mutate: bookmarkPost, isPending: isBookmarking } = useMutation({
    mutationFn: async (postId) => {
      const res = await fetch(`/api/users/bookmark/${postId}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      return data;
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries(["authUser"]);
      const previousUser = queryClient.getQueryData(["authUser"]);

      queryClient.setQueryData(["authUser"], (oldUser) => {
        if (!oldUser) return oldUser;
        const alreadyBookmarked = oldUser.bookmarks.includes(postId);
        return {
          ...oldUser,
          bookmarks: alreadyBookmarked
            ? oldUser.bookmarks.filter((id) => id !== postId)
            : [...oldUser.bookmarks, postId],
        };
      });

      return { previousUser };
    },
    onError: (error, _, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(["authUser"], context.previousUser);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries(["authUser"]);
    },
    onSuccess: (data) => {
      toast.success(data.message || "Bookmark updated");
    },
  });

  /** ================= HANDLERS ================= **/
  const handleDeletePost = () => deletePost();
  const handleLikePost = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLiking) likePost();
  };
  const handleBookmark = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isBookmarking) bookmarkPost(post._id);
  };

  return (
    <div className="flex gap-2 items-start p-4 border-b border-gray-700">
      {isRetweet ? (
        <div className="w-full">
          <p className="text-sm text-gray-400 mb-2">
            Retweeted by @{post.user.username}
          </p>
          {post.originalPost ? (
            <div className="border border-gray-700 rounded-lg p-3">
              <div className="flex justify-between">
                <p className="font-bold">
                  @{post?.originalPost?.user?.username || ""}
                </p>
                {/* Delete Retweet Button */}
                {authUser._id === post.user._id && (
                  <FaTrash
                    className="cursor-pointer hover:text-red-500"
                    onClick={handleDeletePost}
                  />
                )}
              </div>
              <p>{post.originalPost.text}</p>
              {post.originalPost.img && (
                <img
                  src={post.originalPost.img}
                  alt="Original Post"
                  className="rounded-lg mt-2 max-h-96 object-cover"
                />
              )}
            </div>
          ) : (
            <p className="text-gray-500">Original post deleted</p>
          )}
        </div>
      ) : (
        <>
          {/* Avatar */}
          <div className="avatar">
            <Link
              to={`/profile/${postOwner.username}`}
              className="w-8 rounded-full overflow-hidden"
            >
              <img src={postOwner.profileImg || "/avatar-placeholder.png"} />
            </Link>
          </div>

          {/* Content */}
          <div className="flex flex-col flex-1">
            {/* Header */}
            <div className="flex gap-2 items-center">
              <Link to={`/profile/${postOwner.username}`} className="font-bold">
                {postOwner.fullName}
              </Link>
              <span className="text-gray-700 flex gap-1 text-sm">
                <Link to={`/profile/${postOwner.username}`}>
                  @{postOwner.username}
                </Link>
                <span>·</span>
                <span>{formattedDate}</span>
              </span>

              {(isMyPost || (isRetweet && authUser._id === post.user._id)) && (
                <span className="flex justify-end flex-1">
                  {!isDeleting ? (
                    <FaTrash
                      className="cursor-pointer hover:text-red-500"
                      onClick={handleDeletePost}
                    />
                  ) : (
                    <LoadingSpinner size="sm" />
                  )}
                </span>
              )}
            </div>

            {/* Post Text */}
            <div className="flex flex-col gap-3 overflow-hidden">
              <span>{post.text}</span>
              {post.img && (
                <img
                  src={post.img}
                  alt="Post"
                  className="rounded-lg mt-2 max-h-96 object-cover"
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between mt-3">
              <div className="flex gap-4 items-center w-2/3 justify-between">
                {/* Comment */}
                <div
                  className="flex gap-1 items-center cursor-pointer group"
                  onClick={() =>
                    document
                      .getElementById("comments_modal" + post._id)
                      .showModal()
                  }
                >
                  <FaRegComment className="w-4 h-4 text-slate-500 group-hover:text-sky-400" />
                  <span className="text-sm text-slate-500 group-hover:text-sky-400">
                    {post.comments.length}
                  </span>
                </div>

                {/* Retweet */}
                <div
                  className="flex gap-1 items-center group cursor-pointer"
                  onClick={() => retweetPost()}
                >
                  <BiRepost
                    className={`w-6 h-6 ${
                      isRetweeting
                        ? "animate-spin text-green-400"
                        : isRetweeted
                        ? "text-green-500"
                        : "text-slate-500"
                    } group-hover:text-green-500`}
                  />
                  <span
                    className={`text-sm ${
                      isRetweeted ? "text-green-500" : "text-slate-500"
                    } group-hover:text-green-500`}
                  >
                    {post.retweets?.length || 0}
                  </span>
                </div>

                {/* Like */}
                <div
                  className="flex gap-1 items-center group cursor-pointer"
                  onClick={handleLikePost}
                >
                  {isLiking && <LoadingSpinner size="sm" />}
                  {!isLiked && !isLiking && (
                    <FaRegHeart className="w-4 h-4 cursor-pointer text-slate-500 group-hover:text-pink-500" />
                  )}
                  {isLiked && !isLiking && (
                    <FaRegHeart className="w-4 h-4 cursor-pointer text-pink-500" />
                  )}
                  <span
                    className={`text-sm group-hover:text-pink-500 ${
                      isLiked ? "text-pink-500" : "text-slate-500"
                    }`}
                  >
                    {post.likes.length}
                  </span>
                </div>
              </div>

              {/* Bookmark */}
              <div
                className="flex w-1/3 justify-end gap-2 items-center cursor-pointer"
                onClick={handleBookmark}
              >
                {isBookmarked ? (
                  <FaBookmark className="w-4 h-4 text-blue-500" />
                ) : (
                  <FaRegBookmark className="w-4 h-4 text-slate-500" />
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Comment Modal */}
      <dialog id={"comments_modal" + post._id} className="modal">
        <div className="modal-box bg-gray-900 text-white">
          <h3 className="font-bold text-lg mb-4">Comments</h3>

          {/* Previous Comments */}
          <div className="flex flex-col gap-3 max-h-64 overflow-y-auto mb-4">
            {post.comments.length > 0 ? (
              post.comments.map((c, idx) => (
                <div
                  key={idx}
                  className="flex gap-3 border-b border-gray-700 pb-3"
                >
                  {/* Profile Image */}
                  <Link
                    to={`/profile/${c.user.username}`}
                    className="w-8 h-8 rounded-full overflow-hidden"
                  >
                    <img
                      src={c.user.profileImg || "/avatar-placeholder.png"}
                      alt={c.user.username}
                    />
                  </Link>

                  {/* Comment Content */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      {/* Username */}
                      <Link
                        to={`/profile/${c.user.username}`}
                        className="font-semibold hover:underline"
                      >
                        @{c.user.username}
                      </Link>
                      <span className="text-xs text-gray-500">
                        {formatPostDate(c.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm">{c.text}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">
                No comments yet. Be the first!
              </p>
            )}
          </div>

          {/* Add New Comment */}
          <form
            method="dialog"
            onSubmit={handlePostComment}
            className="flex gap-2 mt-4"
          >
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 px-3 py-2 rounded bg-gray-800 border border-gray-600 text-white"
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isCommenting}
            >
              {isCommenting ? "Posting..." : "Post"}
            </button>
          </form>
        </div>

        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
};

export default Post;
