import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import Posts from "../../components/common/Posts";
import ProfileHeaderSkeleton from "../../components/skeletons/ProfileHeaderSkeleton";
import EditProfileModal from "./EditProfileModal";

import { FaArrowLeft } from "react-icons/fa6";
import { IoCalendarOutline } from "react-icons/io5";
import { FaLink } from "react-icons/fa";
import { MdEdit } from "react-icons/md";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMemberSinceDate } from "../../utils/date";

import useFollow from "../../hooks/useFollow";
import useUpdateUserProfile from "../../hooks/useUpdateUserProfile";

const ProfilePage = () => {
  const [coverImg, setCoverImg] = useState(null);
  const [profileImg, setProfileImg] = useState(null);
  const [feedType, setFeedType] = useState("posts");

  const coverImgRef = useRef(null);
  const profileImgRef = useRef(null);

  const { username } = useParams();
  const queryClient = useQueryClient();

  const { follow, isPending } = useFollow();
  const { isUpdatingProfile, updateProfile } = useUpdateUserProfile();

  const { data: authUser, isLoading: authLoading } = useQuery({
    queryKey: ["authUser"],
  });

  const {
    data: profileData,
    isLoading: userLoading,
    isRefetching,
    error,
  } = useQuery({
    queryKey: ["userProfile", username],
    queryFn: async () => {
      const res = await fetch(`/api/users/profile/${username}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      return data;
    },
    enabled: !!username,
    retry: false,
  });

  const isMyProfile = authUser?._id === profileData?._id;
  const amIFollowing =
    !isMyProfile && authUser?.following?.includes(profileData?._id);

  const memberSinceDate = profileData
    ? formatMemberSinceDate(profileData.createdAt)
    : "";

  // ✅ Handle image selection for preview
  const handleImgChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === "coverImg") setCoverImg(file);
    if (type === "profileImg") setProfileImg(file);
  };

  // ✅ Upload images to backend
  const handleUpdateImages = async () => {
    try {
      const formData = new FormData();
      if (profileImg) formData.append("profileImage", profileImg);
      if (coverImg) formData.append("coverImage", coverImg);

      const updatedUser = await updateProfile(formData); // Make sure updateProfile accepts FormData
      setCoverImg(null);
      setProfileImg(null);

      // Update query cache so UI refreshes immediately
      queryClient.setQueryData(["userProfile", username], updatedUser);
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading || userLoading || isRefetching)
    return <ProfileHeaderSkeleton />;
  if (error || !profileData)
    return (
      <p className="text-center text-lg mt-4 text-red-500">
        {error?.message || "User not found"}
      </p>
    );

  return (
    <div className="flex-[4_4_0] border-r border-gray-700 min-h-screen">
      <div className="flex flex-col">
        {/* HEADER */}
        <div className="flex gap-10 px-4 py-2 items-center">
          <Link to="/">
            <FaArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex flex-col">
            <p className="font-bold text-lg">{profileData.fullName}</p>
            <span className="text-sm text-slate-500">
              {profileData.posts?.length || 0} posts
            </span>
          </div>
        </div>

        {/* COVER IMAGE */}
        <div className="relative group/cover">
          <img
            src={
              coverImg
                ? URL.createObjectURL(coverImg)
                : profileData.coverImg || "/cover.png"
            }
            className="h-52 w-full object-cover"
            alt="cover"
          />
          {isMyProfile && (
            <div
              className="absolute top-2 right-2 rounded-full p-2 bg-gray-800 bg-opacity-75 cursor-pointer opacity-0 group-hover/cover:opacity-100 transition duration-200"
              onClick={() => coverImgRef.current.click()}
            >
              <MdEdit className="w-5 h-5 text-white" />
            </div>
          )}
          <input
            type="file"
            hidden
            accept="image/*"
            ref={coverImgRef}
            onChange={(e) => handleImgChange(e, "coverImg")}
          />
          <input
            type="file"
            hidden
            accept="image/*"
            ref={profileImgRef}
            onChange={(e) => handleImgChange(e, "profileImg")}
          />

          {/* USER AVATAR */}
          <div className="avatar absolute -bottom-16 left-4">
            <div className="w-32 rounded-full relative group/avatar">
              <img
                src={
                  profileImg
                    ? URL.createObjectURL(profileImg)
                    : profileData.profileImg || "/avatar-placeholder.png"
                }
                alt="avatar"
              />
              {isMyProfile && (
                <div
                  className="absolute top-5 right-3 p-1 bg-primary rounded-full group-hover/avatar:opacity-100 opacity-0 cursor-pointer"
                  onClick={() => profileImgRef.current.click()}
                >
                  <MdEdit className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex justify-end px-4 mt-5">
          {isMyProfile && (coverImg || profileImg) && (
            <button
              className="btn btn-primary rounded-full btn-sm text-white px-4 ml-2"
              onClick={handleUpdateImages}
            >
              {isUpdatingProfile ? "Updating..." : "Update"}
            </button>
          )}
          {isMyProfile && <EditProfileModal authUser={authUser} />}
          {!isMyProfile && (
            <button
              className="btn btn-outline rounded-full btn-sm"
              onClick={() => follow(profileData._id)}
            >
              {isPending && "Loading..."}
              {!isPending && amIFollowing && "Unfollow"}
              {!isPending && !amIFollowing && "Follow"}
            </button>
          )}
        </div>

        {/* USER INFO */}
        <div className="flex flex-col gap-4 mt-14 px-4">
          <span className="font-bold text-lg">{profileData.fullName}</span>
          <span className="text-sm text-slate-500">
            @{profileData.username}
          </span>
          <span className="text-sm my-1">{profileData.bio}</span>

          <div className="flex gap-2 flex-wrap">
            {profileData.link && (
              <div className="flex gap-1 items-center">
                <FaLink className="w-3 h-3 text-slate-500" />
                <a
                  href={profileData.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-blue-500 hover:underline"
                >
                  {profileData.link}
                </a>
              </div>
            )}
            <div className="flex gap-2 items-center">
              <IoCalendarOutline className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-500">{memberSinceDate}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex gap-1 items-center">
              <span className="font-bold text-xs">
                {profileData.following?.length || 0}
              </span>
              <span className="text-slate-500 text-xs">Following</span>
            </div>
            <div className="flex gap-1 items-center">
              <span className="font-bold text-xs">
                {profileData.followers?.length || 0}
              </span>
              <span className="text-slate-500 text-xs">Followers</span>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex w-full border-b border-gray-700 mt-4">
          <div
            className={`flex justify-center flex-1 p-3 hover:bg-secondary transition duration-300 relative cursor-pointer ${
              feedType === "posts" ? "font-bold" : ""
            }`}
            onClick={() => setFeedType("posts")}
          >
            Posts
            {feedType === "posts" && (
              <div className="absolute bottom-0 w-10 h-1 rounded-full bg-primary" />
            )}
          </div>
          <div
            className={`flex justify-center flex-1 p-3 text-slate-500 hover:bg-secondary transition duration-300 relative cursor-pointer ${
              feedType === "likes" ? "font-bold" : ""
            }`}
            onClick={() => setFeedType("likes")}
          >
            Likes
            {feedType === "likes" && (
              <div className="absolute bottom-0 w-10 h-1 rounded-full bg-primary" />
            )}
          </div>
        </div>

        {/* POSTS */}
        <Posts
          feedType={feedType}
          username={profileData.username}
          userId={profileData._id}
        />
      </div>
    </div>
  );
};

export default ProfilePage;
