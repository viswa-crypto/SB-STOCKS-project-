const express = require("express");
const router = express.Router();
const { updateProfile, changePassword } = require("../controllers/userController");
const { protect } = require("../middleware/auth");

router.put("/me", protect, updateProfile);
router.put("/me/password", protect, changePassword);

module.exports = router;
