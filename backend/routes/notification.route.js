import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import { getNotification, deleteNotifications, deleteNotification } from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/", protectRoute, getNotification);
router.delete("/", protectRoute, deleteNotifications);
router.delete("/:id", protectRoute, deleteNotification);

export default router