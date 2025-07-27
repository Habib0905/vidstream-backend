import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});



const removeFromCloudinary = async (url) => {
  const parts = url.split('/');

  // Find index of the version part (starts with 'v' + numbers)
  const versionIndex = parts.findIndex(
    part => part.startsWith('v') && /^\d+$/.test(part.slice(1))
  );

  if (versionIndex === -1 || versionIndex + 1 >= parts.length) {
    return null; // can't extract
  }

  // Get all parts after the version (can include folders)
  const publicIdParts = parts.slice(versionIndex + 1);

  // Join and remove the file extension (.jpg, .png, etc.)
  const publicId = publicIdParts.join('/').replace(/\.[^/.]+$/, '');

  const response = await cloudinary.uploader.destroy(publicId, (error, result) => {
    if (error) {
      console.error('Error deleting image:', error);
    } else {
      console.log('Delete result:', result);
    }
  });
  return response;
}

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    //file uploaded successfully
    console.log("file has been uploaded successfully ", response.url);
    return response;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    return null;
  } finally {
    fs.unlinkSync(localFilePath);
  }
};

export { uploadOnCloudinary, removeFromCloudinary};
