const express = require("express");
const router = express.Router();
const { getNotifications, markAllRead, clearNotifications } = require("../controllers/notificationController");
const { protect } = require("../middleware/auth");

router.get("/", protect, getNotifications);
router.patch("/read-all", protect, markAllRead);
router.delete("/", protect, clearNotifications);

module.exports = router;
