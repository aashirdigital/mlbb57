const express = require("express");
const {
  loginController,
  authController,
  sendMailController,
  verifyOtpController,
  userProfileUpdateController,
  leaderboardController,
  mobileOtpController,
} = require("../controllers/userCtrl");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const otpRequestLimiter = rateLimit({
  windowMs: 3 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => req.ip,
  message: {
    success: false,
    message: "Too many OTP requests from this device. Please try again later.",
  },
});

// routes
router.post("/login", loginController);
router.post("/getUserData", authMiddleware, authController);
router.post("/send-otp", sendMailController);
router.post("/verify-otp", verifyOtpController);
router.get("/leaderboard", leaderboardController);
// OTP
router.post("/updateprofile", authMiddleware, userProfileUpdateController);
router.post("/mobileotp", mobileOtpController);

module.exports = router;
