import Notification from "../models/notification.model.js";

export const getNotification = async(req, res) => {
    try {
        const userId = req.user._id;

        // find all notifications sent to this user
        const notifications = await Notification.find({ to: userId }).populate({
            path: "from",
            select: "username profileImg",
        });

        await Notification.updateMany({to: userId }, {read: true});

        res.status(200).json(notifications);
    } catch (error) {
        console.log("Error in getNotification function", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export const deleteNotifications = async(req, res) => {
    try {
        // delete notification sent to current user
        const userId = req.user._id;
        await Notification.deleteMany({ to: userId });
        
        res.status(200).json({ message: "Notifications deleted successfully" });
    } catch (error) {
        console.log("Error in deleteNotification function", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export const deleteNotification = async(req, res) => {
    try{
        const notificationId = req.params.id;
        const userId = req.user._id;
        const noticication = await Notification.findById(notificationId);

        if (!noticication) {
            return res.status(404).json({error: "Notification not found"});
        }

        if (Notification.toString() !== userId.toString()) {
            return res.status(403).json({error: "You are not allowed to delete this notification"});
        }

        await Notification.findByIdAndDelete(notificationId);
        res.status(200).json({message: "Notification deleted successfully"});
    } catch(error) {
        console.log("Error in deleteNotification function", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
}