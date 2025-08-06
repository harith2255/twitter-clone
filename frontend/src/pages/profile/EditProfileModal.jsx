import { useEffect, useState, useRef } from "react";
import useUpdateUserProfile from "../../hooks/useUpdateUserProfile";

const EditProfileModal = ({ authUser }) => {
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    bio: "",
    link: "",
    newPassword: "",
    currentPassword: "",
  });

  const [profileImg, setProfileImg] = useState(null);
  const [coverImg, setCoverImg] = useState(null);
  const profileRef = useRef(null);
  const coverRef = useRef(null);

  const { updateProfile, isUpdatingProfile } = useUpdateUserProfile();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e, setter) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please select a valid image file");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        alert("Image size should be less than 2MB");
        return;
      }
      setter(file);
    }
  };

  useEffect(() => {
    if (authUser) {
      setFormData({
        fullName: authUser.fullName || "",
        username: authUser.username || "",
        email: authUser.email || "",
        bio: authUser.bio || "",
        link: authUser.link || "",
        newPassword: "",
        currentPassword: "",
      });
    }
  }, [authUser]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const formPayload = new FormData();
    formPayload.append("fullName", formData.fullName);
    formPayload.append("username", formData.username);
    formPayload.append("email", formData.email);
    formPayload.append("bio", formData.bio);
    formPayload.append("link", formData.link);
    formPayload.append("currentPassword", formData.currentPassword);
    formPayload.append("newPassword", formData.newPassword);

    if (profileImg) formPayload.append("profileImage", profileImg);
    if (coverImg) formPayload.append("coverImage", coverImg);

    updateProfile(formPayload).then(() => {
      setProfileImg(null);
      setCoverImg(null);
      document.getElementById("edit_profile_modal").close();
    });
  };

  return (
    <>
      <button
        className="btn btn-outline rounded-full btn-sm"
        onClick={() =>
          document.getElementById("edit_profile_modal").showModal()
        }
      >
        Edit profile
      </button>
      <dialog id="edit_profile_modal" className="modal">
        <div className="modal-box border rounded-md border-gray-700 shadow-md">
          <h3 className="font-bold text-lg my-3">Update Profile</h3>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {/* Profile and Cover Image Upload */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={
                    profileImg
                      ? URL.createObjectURL(profileImg)
                      : authUser?.profileImage || "/avatar-placeholder.png"
                  }
                  alt="Profile Preview"
                  className="w-16 h-16 rounded-full object-cover border border-gray-600"
                />
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => profileRef.current.click()}
                >
                  Change Profile
                </button>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  ref={profileRef}
                  onChange={(e) => handleFileChange(e, setProfileImg)}
                />
              </div>

              <div className="flex items-center gap-3">
                <img
                  src={
                    coverImg
                      ? URL.createObjectURL(coverImg)
                      : authUser?.coverImage || "/cover-placeholder.png"
                  }
                  alt="Cover Preview"
                  className="w-32 h-16 object-cover border border-gray-600"
                />
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => coverRef.current.click()}
                >
                  Change Cover
                </button>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  ref={coverRef}
                  onChange={(e) => handleFileChange(e, setCoverImg)}
                />
              </div>
            </div>

            {/* Inputs */}
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Full Name"
                className="flex-1 input border border-gray-700 rounded p-2 input-md"
                value={formData.fullName}
                name="fullName"
                onChange={handleInputChange}
              />
              <input
                type="text"
                placeholder="Username"
                className="flex-1 input border border-gray-700 rounded p-2 input-md"
                value={formData.username}
                name="username"
                onChange={handleInputChange}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="email"
                placeholder="Email"
                className="flex-1 input border border-gray-700 rounded p-2 input-md"
                value={formData.email}
                name="email"
                onChange={handleInputChange}
              />
              <textarea
                placeholder="Bio"
                className="flex-1 input border border-gray-700 rounded p-2 input-md"
                value={formData.bio}
                name="bio"
                onChange={handleInputChange}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="password"
                placeholder="Current Password"
                className="flex-1 input border border-gray-700 rounded p-2 input-md"
                value={formData.currentPassword}
                name="currentPassword"
                onChange={handleInputChange}
              />
              <input
                type="password"
                placeholder="New Password"
                className="flex-1 input border border-gray-700 rounded p-2 input-md"
                value={formData.newPassword}
                name="newPassword"
                onChange={handleInputChange}
              />
            </div>
            <input
              type="text"
              placeholder="Link"
              className="flex-1 input border border-gray-700 rounded p-2 input-md"
              value={formData.link}
              name="link"
              onChange={handleInputChange}
            />
            <button
              className="btn btn-primary rounded-full btn-sm text-white"
              disabled={isUpdatingProfile}
            >
              {isUpdatingProfile ? "Updating..." : "Update"}
            </button>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button className="outline-none">close</button>
        </form>
      </dialog>
    </>
  );
};

export default EditProfileModal;
