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

  // ✅ Populate form fields when authUser is loaded
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

  // ✅ Handle text input changes
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ✅ Handle image file selection
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

  // ✅ Handle submit
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.username || !formData.email) {
      alert("Username and Email are required");
      return;
    }

    const formPayload = new FormData();
    for (const key in formData) {
      formPayload.append(key, formData[key]);
    }
    if (profileImg) formPayload.append("profileImg", profileImg);
    if (coverImg) formPayload.append("coverImg", coverImg);

    updateProfile(formPayload)
      .then(() => {
        setProfileImg(null);
        setCoverImg(null);
      })
      .finally(() => {
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
        <div className="modal-box border rounded-md border-gray-700 shadow-md max-w-lg">
          {/* ✅ Show loader if authUser not loaded */}
          {!authUser ? (
            <div className="text-center py-8 text-gray-400">
              Loading profile...
            </div>
          ) : (
            <>
              <h3 className="font-bold text-lg my-3">Update Profile</h3>
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                {/* Profile and Cover Images */}
                <div className="flex flex-col gap-3">
                  {/* Profile Image */}
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        profileImg
                          ? URL.createObjectURL(profileImg)
                          : authUser?.profileImg || "/avatar-placeholder.png"
                      }
                      alt="Profile"
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

                  {/* Cover Image */}
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        coverImg
                          ? URL.createObjectURL(coverImg)
                          : authUser?.coverImg || "/cover-placeholder.png"
                      }
                      alt="Cover"
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
                <input
                  type="text"
                  placeholder="Full Name"
                  className="input border border-gray-700 rounded p-2 input-md"
                  value={formData.fullName}
                  name="fullName"
                  onChange={handleInputChange}
                />
                <input
                  type="text"
                  placeholder="Username"
                  className="input border border-gray-700 rounded p-2 input-md"
                  value={formData.username}
                  name="username"
                  onChange={handleInputChange}
                />
                <input
                  type="email"
                  placeholder="Email"
                  className="input border border-gray-700 rounded p-2 input-md"
                  value={formData.email}
                  name="email"
                  onChange={handleInputChange}
                />
                <textarea
                  placeholder="Bio"
                  className="textarea border border-gray-700 rounded p-2"
                  value={formData.bio}
                  name="bio"
                  onChange={handleInputChange}
                />
                <input
                  type="text"
                  placeholder="Link"
                  className="input border border-gray-700 rounded p-2 input-md"
                  value={formData.link}
                  name="link"
                  onChange={handleInputChange}
                />
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Current Password"
                    className="input border border-gray-700 rounded p-2 input-md"
                    value={formData.currentPassword}
                    name="currentPassword"
                    onChange={handleInputChange}
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    className="input border border-gray-700 rounded p-2 input-md"
                    value={formData.newPassword}
                    name="newPassword"
                    onChange={handleInputChange}
                  />
                </div>
                <button
                  className="btn btn-primary rounded-full btn-sm text-white"
                  disabled={isUpdatingProfile}
                >
                  {isUpdatingProfile ? "Updating..." : "Update"}
                </button>
              </form>
            </>
          )}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button className="outline-none">close</button>
        </form>
      </dialog>
    </>
  );
};

export default EditProfileModal;
