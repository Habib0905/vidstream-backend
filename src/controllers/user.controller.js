import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary, removeFromCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

//generates access token and refresh token for user : -
const generateAccessTokenandRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Failed to generate tokens");
  }
};

//user registration controller : -
const registerUser = asyncHandler(async (req, res) => {
  // get userdetails from request body
  const { fullName, username, email, password } = req.body;

  // validation -not empty
  if (
    [fullName, email, username, password].some((field) => field?.trim() == "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  // check if user already exists: username or email
  const existUser = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (existUser) {
    throw new ApiError(400, "User already exists with this email or username");
  }
  // check for images, check for avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;

  //const converImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  // upload them to cloudinary, check if avatar is uploaded

  const avatarResponse = await uploadOnCloudinary(avatarLocalPath);
  const coverImageResponse = await uploadOnCloudinary(coverImageLocalPath);
  console.log("avatarResponse: ", avatarResponse);

  if (!avatarResponse) {
    throw new ApiError(500, "Failed to upload avatar image");
  }

  // create user object -create entry in db
  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    email,
    password,
    avatar: avatarResponse.url,
    coverImage: coverImageResponse?.url || "",
  });

  // remove password and refresh token fields from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // check for user creation
  if (!createdUser) {
    throw new ApiError(500, "Failed to create user");
  }

  // return response

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

//user login controller : -
const loginUser = asyncHandler(async (req, res) => {
  console.log("Login user function called");
  // return response

  // get user details from request body
  const { email, username, password } = req.body;

  if (!email && !username) {
    throw new ApiError(400, "Email or username is required");
  }
  // find user
  const user = await User.findOne({ $or: [{ email }, { username }] });

  if (!user) {
    throw new ApiError(404, "User doesn't exist");
  }
  // check if credientials are correct
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  // if correct, generate access token and refresh token
  const { accessToken, refreshToken } =
    await generateAccessTokenandRefreshToken(user._id);

  console.log("accessToken: ", accessToken);
  console.log("refreshToken: ", refreshToken);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // send cookie
  const options = {
    httpOnly: false,
    secure: false,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, loggedInUser, "User logged in successfully"));
});

//user logout controller : -
const logoutUser = asyncHandler(async (req, res) => {
  //remove refresh token from user
  User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    {
      new: true,
    }
  );
  //remove access token from cookies
  const options = {
    httpOnly: false,
    secure: false,
  };
  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, null, "User logged out successfully"));
});

//refresh access token controller : -
const refreshAccessToken = asyncHandler(async (req, res) => {
  // get refresh token from cookies
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }
  // verify refresh token
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    //find user by id
    const user = await User.findById(decodedToken._id);
    if (!user) {
      throw new ApiError(404, "Invalid refresh token or user not found");
    }
    //compare it with the one in db
    if (user?.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "Invalid refresh token");
    }

    // if it matches, generate new access token
    const { accessToken, newRefreshToken } =
      await generateAccessTokenandRefreshToken(user._id);
    //send new access token in cookies
    const options = {
      httpOnly: false,
      secure: false,
    };
    res
      .status(200)
      .cookies("accessToken", accessToken, options)
      .cookies("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

//current password change controller : -
const changeCurrerntPassword = asyncHandler(async (req, res) => {
  //take current pasword, new password from request body
  const { currentPassword, newPassword } = req.body;
  //find user by id
  const user = await User.findById(req.user._id);
  // validate current password
  const isCurrentPasswordValid = await user.isPasswordCorrect(currentPassword);
  if (!isCurrentPasswordValid) {
    throw new ApiError(401, "Current password is incorrect");
  }
  // if valid, update password in db
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  // return response

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password changed successfully"));
});

//get current user controller : -
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

//update account details controller : -
const updateAccountDetails = asyncHandler(async (req, res) => {
  // get user details from request body
  // then update the user details in the database
  const { fullName, email } = req.body;
  if (!fullName && !email) {
    throw new ApiError(400, "Full name and email are required");
  }
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

//update user avatar controller : -
const updateUserAvatar = asyncHandler(async (req, res) => {
  //get avatar from request body
  const avatarLocalPath = req.file?.avatar[0].path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image file is missing");
  }
  //upload it to cloudinary
  const avatarResponse = await uploadOnCloudinary(avatarLocalPath);
  if (!avatarResponse) {
    throw new ApiError(500, "Failed to upload avatar image");
  }


  //update the avatar url in the database
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatarResponse.url,
      },
    },
    {
      new: true,
    }
  );

    //remove old avatar from cloudinary
  const oldAvatarUrl = req.user.avatar;
  const removalResponse = await removeFromCloudinary(oldAvatarUrl)
  if (!removalResponse) {
    throw new ApiError(500, "Failed to remove old avatar image from cloudinary");
  }
  

  //send response with updated user details
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

//update cover image controller : -
const updateUserCoverImage = asyncHandler(async (req, res) => {
  //get cover image from request body
  const coverImageLocalPath = req.file?.coverImage[0].path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is missing");
  }
  //upload it to cloudinary
  const coverImageResponse = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImageResponse) {
    throw new ApiError(500, "Failed to upload cover image");
  }
  //update the cover image url in the database
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: coverImageResponse.url,
      },
    },
    {
      new: true,
    }
  );


  // remove old cover image from cloudinary 
  if (req.user.coverImage) {
    const oldCoverImageUrl = req.user.coverImage;
    const removalResponse = await removeFromCloudinary(oldCoverImageUrl)
    if (!removalResponse) {
      throw new ApiError(500, "Failed to remove old cover image from cloudinary");
    }
  }
  //send response with updated user details
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

// get user channel profile controller : -
const getUserChannelProfile = asyncHandler(async (req, res) => {
  //get user from params
  const { username} = req.params;

  if(!username?.trim()){
    throw new ApiError(400, "Username is missing");
  }
  //get channel information using aggregation pipeline
  const channel = await User.aggregate([
    {
      $match : {
        username: username.toLowerCase()
      } 
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as : "subscribers"
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as : "subscibedTo"
      }
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "subscribers"
        },
        channelsSubscribedToCount: {
          $size: "subscibedTo"
      },
        isSubscribed: {
          $cond: {
            if: {$in: [req.user._id, "$subscibers.subscriber"]},
            then: true,
            else: false
          }
        }
    }
    },
    {
      $project:{
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1
      }
    }
  ])
  //return response with channel information
  if (!channel?.length) {
    throw new ApiError(404, "Channel not found");
  }

  res
  .status(200)
  .json(new ApiResponse(200, channel[0], "Channel profile fetched successfully"))
})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrerntPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserCoverImage,
  updateUserAvatar,
  getUserChannelProfile
};
