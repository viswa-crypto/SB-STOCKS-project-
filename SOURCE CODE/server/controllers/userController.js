const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");

// @desc Update own profile
// @route PUT /api/users/me
const updateProfile = asyncHandler(async (req, res) => {
  const { name, profileImage } = req.body;
  const user = await User.findById(req.user._id);

  if (name) user.name = name;
  if (profileImage !== undefined) user.profileImage = profileImage;

  await user.save();
  res.json({ success: true, user });
});

// @desc Change password
// @route PUT /api/users/me/password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password");

  if (!(await user.matchPassword(currentPassword))) {
    res.status(401);
    throw new Error("Current password is incorrect");
  }

  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: "Password updated" });
});

module.exports = { updateProfile, changePassword };
