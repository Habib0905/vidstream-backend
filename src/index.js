import connectDB from "./db/connection.js";
import dotenv from "dotenv";
import { app } from "./app.js";

dotenv.config({
  path: "./.env",
});

connectDB()
  .then(() => {
    const PORT = process.env.PORT || 8000;
    const server = app.listen(PORT, () => {
      console.log(`Server is running at port : ${PORT}`);
    });
    server.on("error", (err) => {
      console.error("Server error:", err.message);
      process.exit(1);
    });
  })
  .catch((error) => {
    console.log("MongoDB connection failed!!", error);
  });

/*
import express from "express";


const app = express();

( async() => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error", (error) => {
            console.log("Error: ", error);
            throw error
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
        })

    } catch (error){
        console.error("Error", error)
        throw error
    }
})()


*/
