import express from "express"; 
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import {v2 as cloudinary} from "cloudinary";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import connectMongoDB from "./db/connectMongoDB.js";


dotenv.config({
});

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const PORT = process.env.PORT || 6000;
console.log(process.env.MONGO_URI);

app.use(express.json()); // to parse the req.body
app.use(express.urlencoded({ extented: true})); // to parse from data(urlencoded)
 
app.use(cookieParser()); // to parse the cookie

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
    connectMongoDB();
});