import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"

//get all videos controller :-
const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType } = req.query
    //TODO: get all videos based on query, sort, pagination
    page = parseInt(page)
    limit = parseInt(limit)

    //creating filter and sort option
    const filter = {}
    if (query) {
        filter.title = { $regex : query, $options: 'i'}
    }

    const sortOption = {}
    sortOption[sortBy] = sortType === 'desc' ? -1 : 1

// finding videos with filter, pagination and sort options
    const videos = await Video.find(filter)
        .sort(sortOption)
        .skip((page - 1) * limit)
        .limit(limit)
    // Count total videos and total pages
    const totalVideos = await Video.countDocuments(filter)

    const totalPages = Math.ceil(totalVideos / limit)

//send reponse
    res.status(200)
        .json(ApiResponse(
            200,
            {
                videos,
                totalVideos,
                totalPages,
                currentPage: page
            },
            "Videos fetched successfully"
        ))
    
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    
    videoPath = req.files.video[0].path
    thumbnailPath = req.files.thumbnail[0].path

    if(!title || !description || !videoPath || !thumbnailPath) {
        throw new ApiError(400, "Title, description, video and thumbnail are required")
    }
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}