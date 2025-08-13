import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let folder = "twitter-clone/posts";
    if (file.fieldname === "profileImage") folder = "twitter-clone/profile";
    if (file.fieldname === "coverImage") folder = "twitter-clone/cover";

    return {
      folder,
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      public_id: `${Date.now()}-${file.originalname}`,
    };
  },
});

const upload = multer({ storage });

export default upload;
