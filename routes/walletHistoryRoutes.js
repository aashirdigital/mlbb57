const express = require("express");
const {} = require("../controllers/orderCtrl");
const {
  addWalletHistoryController,
  getWalletHistoryController,
  getAddMoneyHistoryAdmin,
} = require("../controllers/walletHistoryCtrl");
const browserMiddleware = require("../middlewares/browserMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");
const adminAuthMiddleware = require("../middlewares/adminAuthMiddleware");

const router = express.Router();

// routes
router.post("/add-wallet-history", addWalletHistoryController);
router.post("/wallet-history", authMiddleware, getWalletHistoryController);
router.get("/addmoneyhistory", adminAuthMiddleware, getAddMoneyHistoryAdmin);

module.exports = router;
