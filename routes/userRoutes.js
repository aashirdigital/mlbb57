const express = require("express");
const {
  loginController,
  authController,
  sendMailController,
  verifyOtpController,
  userProfileUpdateController,
  sendMobileOtpController,
  leaderboardController,
  mobileOtpController,
} = require("../controllers/userCtrl");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

const usageCount = {};
// Routes
router.post("/login", loginController);
router.post("/getUserData", authMiddleware, authController);
router.post("/send-otp", sendMailController);
router.post("/verify-otp", verifyOtpController);
router.get("/leaderboard", leaderboardController);
router.post("/updateprofile", authMiddleware, userProfileUpdateController);

router.post(
  "/mobileotp",
  (req, res, next) => {
    const deviceId = req.headers["device-id"]; // Get device ID from request header
    if (!usageCount[deviceId]) {
      usageCount[deviceId] = 0;
    }
    usageCount[deviceId] += 1;
    if (usageCount[deviceId] > 3) {
      return res
        .status(429)
        .json({ message: "Device blocked due to excessive usage" });
    }
    next();
  },
  mobileOtpController
);

module.exports = router;
