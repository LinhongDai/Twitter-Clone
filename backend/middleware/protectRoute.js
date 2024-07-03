import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

// next declares that next function can be runed after this
export const protectRoute = async (req, res, next) => {
    try {
        // parser the token and check if this token exists
        const token = req.cookies.jwt;
        if (!token) {
            return res.status(401).json({ error: "Unauthorized: No Token Provided" });
        }

        // check if it is a valid token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded) {
            return res.status(401).json({ error: "Unauthorized: Invalid Token"});
        }

        const user = await User.findById(decoded.userId).select("-password");

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }


        req.user = user;
        next();
    } catch (err) {
        console.log("Error in protectRoute middleware", err.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }  
};