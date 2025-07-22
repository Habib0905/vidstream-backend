import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    //grab the token
    const token =
      req.cookies.accessToken ||
      req.headers.authorization?.replace("Bearer ", ""); //.split(" ")[1];
    //check if token is present
    if (!token) {
      throw new ApiError(401, "Access token is required");
    }
    //verify and decode the token
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    //use user id from the decoded token and find the user
    const user = await User.findById(decodedToken._id).select(
      "-password -refreshToken"
    );

    //check if user exists
    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }

    //attach user to the request object
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});

export { verifyJWT };
