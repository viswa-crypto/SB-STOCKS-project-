const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getUsers,
  updateUser,
  deleteUser,
  createStock,
  updateStock,
  deleteStock,
  getAllTransactions,
  getLogs,
} = require("../controllers/adminController");
const { protect } = require("../middleware/auth");
const admin = require("../middleware/admin");

router.use(protect, admin);

router.get("/dashboard", getDashboardStats);
router.get("/logs", getLogs);
router.get("/users", getUsers);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);
router.post("/stocks", createStock);
router.put("/stocks/:id", updateStock);
router.delete("/stocks/:id", deleteStock);
router.get("/transactions", getAllTransactions);

module.exports = router;
