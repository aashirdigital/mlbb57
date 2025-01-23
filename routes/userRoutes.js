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
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.body.mobile,
  message: {
    success: false,
    message: "Too many OTP requests. Please try again later.",
  },
});

// routes
router.post("/login", loginController);
// router.post("/send-mobile-otp", sendMobileOtpController);
router.post("/getUserData", authMiddleware, authController);
router.post("/send-otp", sendMailController);
router.post("/verify-otp", verifyOtpController);
router.get("/leaderboard", leaderboardController);
// OTP
router.post("/mobileotp", otpRequestLimiter, mobileOtpController);
router.post("/updateprofile", authMiddleware, userProfileUpdateController);

module.exports = router;
