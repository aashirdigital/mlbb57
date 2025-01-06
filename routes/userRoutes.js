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
// routes
router.post("/login", loginController);
router.post("/send-mobile-otp", sendMobileOtpController);
router.post("/getUserData", authMiddleware, authController);
router.post("/send-otp", sendMailController);
router.post("/verify-otp", verifyOtpController);
router.get("/leaderboard", leaderboardController);
// OTP
router.post("/mobileotp", mobileOtpController);
router.post("/updateprofile", authMiddleware, userProfileUpdateController);

module.exports = router;
