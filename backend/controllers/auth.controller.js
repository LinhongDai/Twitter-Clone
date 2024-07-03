import User from '../models/user.model.js';
import bcrypt from 'bcryptjs/dist/bcrypt.js';
import { generateTokenAndSetCookie } from '../lib/utils/generateToken.js';

export const signup = async(req, res) => {
    try {
        const {fullName, username, email, password} = req.body;
        
        // testing the email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid email format"});
        }

        // check the existing user
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({error: "Username is already taken"});
        }

        // check the existing email
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({error: "Email is already taken"});
        }

        // check password length
        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters long" });
        }

        // hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // create new user and save it into the database
        const newUser = User({
            fullName,
            username,
            email,
            password: hashedPassword
        });

        if (newUser) {
            // generate token and a cookie, the web page will remember this cookie containing token
            generateTokenAndSetCookie(newUser._id,res);
            await newUser.save();

            // send response
            res.status(201).json({
                _id: newUser._id,
                fullName: newUser.fullName,
                username: newUser.username,
                email: newUser.email,
                followers: newUser.followers,
                following: newUser.following,
                profileImg: newUser.profileImg,
                coverImg: newUser.coverImg,
            });
        } else {
            res.status(400).json({ error: "Invalid user data"});
        }
    } catch(error) {
        console.log("Error in signup controller", error.message);

        res.status(500).json({ error: "Internal Server Error"});
    }
}

export const login = async(req, res) => {
    try {
        const {username, password} = req.body;

        // check if the user exists in the database
        const user = await User.findOne({username});

        // check if passwords match
        const isPasswordCorrect = await bcrypt.compare(password, user?.password || "");

        if (!user || !isPasswordCorrect) {
            res.status(400).json({ error: "Invalid username or password"});
        }

        // generate a cookie containing a token
        generateTokenAndSetCookie(user._id, res);

        // send response
        res.status(200).json({
            _id: user._id,
            fullName: user.fullName,
            username: user.username,
            email: user.email,
            followers: user.followers,
            following: user.following,
            profileImg: user.profileImg,
            coverImg: user.coverImg,
        });
    } catch (error) {
        console.log("Error in login controlloer", error.message);
        res.status(500).json({ error: "Internal Server Error"});
    }
};

export const logout = async(req, res) => {
    try {
        // destroy the jwt token
        res.cookie("jwt","",{maxAge:0})
        res.status(200).json({message:"Logged out successfully"})
    } catch (error) {
        console.log("Error in logout controller", error.message);
        res.status(500).json({ error: "Internal Server Error"});
    }
};

export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password");
        res.status(200).json(user);
    } catch (error) {
        console.log("Error in getMe controller", error.messgae);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
