import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { getAllVideos } from "../controllers/video.controller.js";
import { publishAVideo } from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";



const router = Router();
router.use(verifyJWT);

router.route("/videos")
.get(getAllVideos)
.post(
    upload.fields([{ name: "video", maxCount: 1 }, { name: "thumbnail", maxCount: 1 }]),
    publishAVideo
)