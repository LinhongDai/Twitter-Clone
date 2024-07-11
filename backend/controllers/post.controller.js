import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import Notification from "../models/notification.model.js";
import { v2 as cloudinary } from 'cloudinary';


export const createPost = async(req, res) => {
    try {
        const { text } = req.body;
        let { img } = req.body;
        const userId = req.user._id.toString();

        // declare a user object
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (!text && !img) {
            return res.status(400).json({ error: "Post must have text or image" });
        }

        if(img) {

            // call cloudinary's API to upload the img stored in the variable
            const uploadedResponse = await cloudinary.uploader.upload(img)

            // replace the original url with the url of the uploaded image hosted on Cloudinary
            img = uploadedResponse.secure_url;
        }

        // create a new post model
        const newPost = new Post({
            user: userId,
            text,
            img,
        });

        await newPost.save();
        res.status(201).json(newPost);
    } catch (error) {
        console.log("Error in createPost controller: ", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const deletePost = async(req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }

        // other users are not authorized to delete the post
        if (post.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ error: "You are not authorized to delete this post" });
        }

        // destroy the image
        if (post.img) {
            const imgId = post.img.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(imgId);
        }

        await Post.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: "Post deleted successfully" })
    } catch (error) {
        console.log("Error in deletePost controller: ", error);
        res.status(500).json({error: "Internal server error" });
    }
}

export const commentOnPost = async(req, res) => {
    try {
        const { text } = req.body;
        const postId = req.params.id;
        const userId = req.user._id;

        if(!text) {
            return res.status(400).json({ error: "Text field is required" });
        }

        // add comment and save it to the database
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }

        const comment = { user: userId, text};
        post.comments.push(comment);
        await post.save();

        res.status(200).json(post);

    } catch (error) {
        console.log("Error in commentOnPost controller: ", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const likeUnlikePost = async(req, res) => {
    try {
        const userId = req.user._id;
        const {id:postId} = req.params;

        const post = await Post.findById(postId);

        // check the existence of the post
        if (!post) {
            return res.status(404).json({error: "Post not found"});
        }

        const userLikedPost = post.likes.includes(userId);

        if(userLikedPost) {
            // Unlike post (update and save)
            // 在user model中也要移除相应的user liked的post
            await Post.updateOne({_id: postId}, {$pull: {likes: userId}});
            await User.updateOne({ _id: userId }, { $pull: { likedPosts: postId } });

            // updatedLikes 是更新后的list
            const updatedLikes = post.likes.filter((id) => id.toString() !== userId.toString());
            res.status(200).json(updatedLikes);
        } else {
            // like post
            post.likes.push(userId);
            await User.updateOne({ _id: userId }, { $push: { likedPosts: postId } });
            await post.save();

            // send a notification
            const notification = new Notification({
                from: userId,
                to: post.user,
                type: "like",
            });
            await notification.save();

            const updatedLikes = post.likes;
            res.status(200).json(updatedLikes)
        }
    } catch (error) {
        console.log("Error in likeUnlikePost controller: ", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const getAllPost = async(req, res) => {
    try {
        // fetch the newest posts with user information
        const posts = await Post.find()
        .sort({ createdAt: -1})
        .populate({
            path: "user", // field populated
            select: "-password",
        })
        .populate({
            path: "comments.user",
            select: "-password",
        });

        if (posts.length === 0) {
            return res.status(200).json([]);
        }

        res.status(200).json(posts);
    } catch (error) {
        console.log("Error in getAllPost controller: ", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const getLikedPosts = async(req, res) => {
    const userId = req.params.id;

    try {
        // get a user's liked post
        const user = await User.findById(userId); // fetch the user information
        if (!user) return res.status(404).json({ error: "User not found" });

        const likedPosts = await Post.find({ _id: {$in: user.likedPosts } })
        .populate({
            path: "user",
            select: "-password",
        })
        .populate({
            path: "comments.user",
            select: "-password",
        });
        res.status(200).json(likedPosts);
    } catch (error) {
        console.log("Error in getLikedPost controller: ", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const getFollowingPosts = async(req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });
        
        const following = user.following;

        // fetch the following user's post
        // following is a list of user ids of users that the current user follows
        const feedPost = await Post.find({ user: { $in: following } })
        .sort({ createdAt: -1})
        .populate({
            path: "user",
            select: "-password", 
        })
        .populate({
            path: "comments.user",
            select: "-password",
        });

        res.status(200).json(feedPost);
    } catch (error) {
        console.log("Error in getFollowingPosts controller: ", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const getUserPosts = async(req, res) => {
    try {
        const { username } = req.params;

        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ error: "User not found" });

        // find aa posts with current user id
        const posts = await Post.find({ user: user._id })
        .sort({ createdAt: -1 })
        .populate({
            path: "user",
            select: "-password",
        })
        .populate({
            path: "comments.user",
            select: "-password",
        })

        res.status(200).json(posts);
    } catch (error) {
        console.log("Error in getUserPosts controller: ", error);
        res.status(500).json({ error: "Internal server error" });
    }
}