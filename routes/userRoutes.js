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
const rateLimit = require("express-rate-limit");

const otpRequestLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 3, // Maximum 3 requests
  keyGenerator: (req) => {
    req.ip;
    console.log(req.ip);
  },
  message: {
    success: false,
    message: "Too many OTP requests. Please try again later.",
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
router.post("/mobileotp", otpRequestLimiter, mobileOtpController);

module.exports = router;
