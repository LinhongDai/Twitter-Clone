import express from "express"; 
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import connectMongoDB from "./db/connectMongoDB.js";
import cookieParser from "cookie-parser";

dotenv.config()

const app = express();
const PORT = process.env.PORT || 6000;
console.log(process.env.MONGO_URI);

app.use(express.json()); // to parse the req.body
app.use(express.urlencoded({ extented: true})); // to parse from data(urlencoded)

app.use(cookieParser()); // to parse the cookie

app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
    connectMongoDB();
});