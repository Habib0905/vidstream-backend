// test-upload.js
import { uploadOnCloudinary } from "./src/utils/cloudinary.js";

console.log("🔧 Starting test-upload.js");

const test = async () => {
  console.log("📤 Calling uploadOnCloudinary...");
  console.log("🌐 CLOUDINARY_API_KEY:", process.env.CLOUDINARY_API_KEY);

  const result = await uploadOnCloudinary(
    "./public/temp/avatar-1752814790111-40731694"
  );
  console.log("✅ Upload result:", result);
};

test();
