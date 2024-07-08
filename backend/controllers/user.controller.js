import bcrypt from "bcryptjs/dist/bcrypt.js";
import { v2 as cloudinary } from 'cloudinary';
// models
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";


export const getUserProfile = async (req, res) => {
    const { username } = req.params;

    try {
        const user = await User.findOne({ username }).select("-password");
        if (!user) 
            return res.status(404).json({ error: error.message });

        res.status(200).json(user);
    } catch (error) {
        console.log("Error in getUserProfile: ", error.message);
        res.status(500).json({ error: error.message });
    }
};

export const followUnfollowUser = async (req, res) => {
    try {
        const { id } = req.params;
        const userToModify = await User.findById(id);

        // req is an object with current user information
        const currentUser = await User.findById(req.user._id);

        // can't do operation on the user itself
        if(id === req.user._id.toString()) {
            return res.status(400).json({ error: "You can't follow/unfollow yourself" });
        }

        // user not found
        if (!userToModify || !currentUser) return res.status(400).json({ error: "User not found" });

        const isFollowing = currentUser.following.includes(id);

        if (isFollowing) {
            // unfollow the user
            await User.findByIdAndUpdate(id, { $pull: {followers: req.user._id} });
            await User.findByIdAndUpdate(req.user._id, {$pull: { following: id} });
            
            // TODO: return the id of the user as a response
            res.status(200).json({ message: "User unfollowed successfully" });
            // send the notification 
        } else {
            // follow the user
            await User.findByIdAndUpdate(id, { $push: {followers: req.user._id} });
            await User.findByIdAndUpdate(req.user._id, { $push: {following: id} });
            
            // send the notification to the user
            const newNotification = new Notification({
                type: "follow",
                from: req.user._id,
                to: userToModify._id,
            });
            await newNotification.save();

            // TODO: return the id of the user as a response
            res.status(200).json({ message: "User followed successfully" });
        }
    } catch (error) {
        console.log("Error in followUnfollowUser: ", error.message);
        res.status(500).json({ error: error.message });
    }
};

export const getSuggestedUsers = async (req, res) => {
    try {
        // exclude ourselves and the users we followed
        const userId = req.user._id;

        // get the following list of current user
        const usersFollowedByMe = await User.findById(userId).select("following");

        // 聚合查询，排除当前用户并随机选择10个用户
        const users = await User.aggregate([
            {
                $match: {
                    _id: { $ne: userId },
                },
            },
            { $sample: { size: 10 } },
        ]);

        // 123456
        // filter the users followed by the current user
        const filteredUsers = users.filter((user) => !usersFollowedByMe.following.includes(user._id));
        const suggestedUsers = filteredUsers.slice(0,4); // return 0 - 4 users as suggested users

        // remove password
        suggestedUsers.forEach((user) => (user.password = null));
        res.status(200).json(suggestedUsers);
    } catch (error) {
        console.log("Error in getSuggestedUsers: ", error.message);
        res.status(500).json({ error: error.message });
    }
};

export const updateUser = async (req, res) => {
    // updated info in the req body
    const { fullName, email, username, currentPassword, newPassword, bio, link} = req.body;
    let { profileImg, coverImg } = req.body;

    const userId = req.user._id;

    try {
        // retrieve the current user by id
        let currentUser = await User.findById(userId);
        if(!currentUser) return res.status(404).json({ message: "User not found" });

        // update password
        if ((!newPassword && currentPassword) || (!currentPassword && newPassword)) {
            return res.status(400).json({ error: "Please provide both current password and new password" });
        }

        if (currentPassword && newPassword) {
            const isMatch = await bcrypt.compare(currentPassword, currentUser.password);
            if (!isMatch) return res.status(400).json({ error: "Current password is incorrect" });
            if (newPassword.length < 6) {
                return res.status(400).json({ error: "Password must be at least 6 characters long" });
            }

            const salt = await bcrypt.genSalt(10);
            currentUser.password = await bcrypt.hash(newPassword, salt);
        }

        // update profile image
        if (profileImg) {
            // delete the old one
            if (currentUser.profileImg) {
                await cloudinary.uploader.destroy(currentUser.profileImg.split("/").pop().split(".")[0]);
            }

            // upload the new one
            const uploadedResponse = await cloudinary.uploader.upload(profileImg)
            profileImg = uploadedResponse.secure_url;
        }

        // update cover image
        if (coverImg) {
            // delete the old one
            if (currentUser.coverImg) {
                await cloudinary.uploader.destroy(currentUser.coverImg.split("/").pop().split(".")[0]);
            }
            // upload the new one
            const uploadedResponse = await cloudinary.uploader.upload(coverImg)
            profileImg = uploadedResponse.secure_url;
        }

        // form the updated user
        currentUser.fullName = fullName || currentUser.fullName;
        currentUser.email = email || currentUser.email;
        currentUser.username = username || currentUser.username;
        currentUser.bio = bio || currentUser.bio;
        currentUser.link = link || currentUser.link;
        currentUser.profileImg = profileImg || currentUser.profileImg;
        currentUser.coverImg = coverImg || currentUser.coverImg;

        currentUser = await currentUser.save();
        currentUser.password = null;

        return res.status(200).json(currentUser);
    } catch (error) {
        console.log("Error in updateUser: ", error.message);
        res.status(500).json({ error: error.message });
    }
};