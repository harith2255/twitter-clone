import { CiImageOn } from "react-icons/ci";
import { BsEmojiSmileFill } from "react-icons/bs";
import { IoCloseSharp } from "react-icons/io5";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

const CreatePost = () => {
  const [text, setText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [imgFile, setImgFile] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const imgRef = useRef(null);

  const { data: authUser } = useQuery({ queryKey: ["authUser"] });
  const queryClient = useQueryClient();

  // ✅ Mutation for creating a post
  const { mutate: createPost, isPending } = useMutation({
    mutationFn: async (formData) => {
      const res = await fetch("/api/posts/create", {
        method: "POST",
        body: formData, // ✅ FormData for text & image
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }
      return data;
    },
    onSuccess: (data) => {
      // ✅ Reset input fields
      setText("");
      setImgFile(null);
      setImgPreview(null);
      if (imgRef.current) imgRef.current.value = "";

      toast.success("Post created successfully");

      // ✅ Optimistically update feed
      queryClient.setQueryData(["posts"], (oldPosts) => {
        if (!oldPosts) return [data.post];
        return [data.post, ...oldPosts];
      });
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // ✅ Submit handler
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!text.trim() && !imgFile) {
      toast.error("Post cannot be empty");
      return;
    }

    const formData = new FormData();
    formData.append("text", text.trim());
    if (imgFile) {
      formData.append("image", imgFile);
    }

    createPost(formData);
  };

  // ✅ Image selection handler
  const handleImgChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image size should be less than 2MB");
      return;
    }

    setImgFile(file);

    // ✅ Preview
    const reader = new FileReader();
    reader.onload = () => setImgPreview(reader.result);
    reader.readAsDataURL(file);
  };

  // ✅ Remove image
  const removeImage = () => {
    setImgFile(null);
    setImgPreview(null);
    if (imgRef.current) imgRef.current.value = "";
  };

  // ✅ Emoji click handler
  const onEmojiClick = (emojiData) => {
    setText((prevText) => prevText + emojiData.emoji);
  };

  return (
    <div className="flex p-4 items-start gap-4 border-b border-gray-700">
      {/* ✅ User Avatar */}
      <div className="avatar">
        <div className="w-8 rounded-full">
          <img
            src={authUser?.profileImg || "/avatar-placeholder.png"}
            alt="User Avatar"
          />
        </div>
      </div>

      {/* ✅ Post Form */}
      <form className="flex flex-col gap-2 w-full" onSubmit={handleSubmit}>
        <textarea
          className="textarea w-full p-0 text-lg resize-none border-none focus:outline-none border-gray-800"
          placeholder="What is happening?!"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {/* ✅ Image Preview */}
        {imgPreview && (
          <div className="relative w-72 mx-auto">
            <IoCloseSharp
              className="absolute top-0 right-0 text-white bg-gray-800 rounded-full w-5 h-5 cursor-pointer"
              onClick={removeImage}
            />
            <img
              src={imgPreview}
              className="w-full mx-auto h-72 object-contain rounded"
              alt="Preview"
            />
          </div>
        )}

        {/* ✅ Buttons */}
        <div className="flex justify-between border-t py-2 border-t-gray-700 relative">
          <div className="flex gap-4 items-center">
            {/* Image upload */}
            <CiImageOn
              className="fill-primary w-6 h-6 cursor-pointer"
              onClick={() => imgRef.current.click()}
            />
            {/* Emoji Picker Toggle */}
            <BsEmojiSmileFill
              className="fill-primary w-5 h-5 cursor-pointer"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            />
          </div>

          {/* ✅ Emoji Picker */}
          {showEmojiPicker && (
            <div className="absolute left-10 bottom-12 z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-lg">
              <EmojiPicker
                onEmojiClick={onEmojiClick}
                theme="dark"
                searchDisabled={false}
              />
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            hidden
            ref={imgRef}
            onChange={handleImgChange}
          />

          <button
            type="submit"
            className="btn btn-primary rounded-full btn-sm text-white px-4"
            disabled={isPending}
          >
            {isPending ? "Posting..." : "Post"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;
