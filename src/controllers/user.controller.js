import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
  const coverImageResponse = await uploadOnCloudinary(converImageLocalPath);
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

const loginUser = asyncHandler(async (req, res) => {
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
  const isPasswordCValid = await user.isPasswordCorrect(password);

  if (!isPasswordCValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  // if correct, generate access token and refresh token
  const { accessToken, refreshToken } = generateAccessTokenandRefreshToken(
    user._id
  );

  loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // send cookie
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, loggedInUser, "User logged in successfully"));
});

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
    //remove access token from cookies
  );
});

export { registerUser, loginUser, logoutUser };
