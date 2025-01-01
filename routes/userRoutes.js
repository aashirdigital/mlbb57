const express = require("express");
const {
  loginController,
  authController,
  sendMailController,
  verifyOtpController,
  updatePassController,
  adminController,
  userProfileUpdateController,
  sendMobileOtpController,
  leaderboardController,
  sendOtpController,
  profileUpdateController,
} = require("../controllers/userCtrl");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();
// routes
// router.post("/admin", adminController);
// router.post("/register", registerController);
// router.post("/update-pass", updatePassController);
// router.post("/get-payment-method", browserMiddleware, getUserPaymentDetailsController);
// router.post("/send-mobile-otp", sendMobileOtpController);
router.post("/login", loginController);
router.post("/updateprofile", authMiddleware, userProfileUpdateController);
router.post("/getUserData", authMiddleware, authController);
router.post("/send-otp", sendMailController);
router.post("/verify-otp", verifyOtpController);
router.get("/leaderboard", leaderboardController);
// OTP
router.post("/sendotp", sendOtpController);
router.post("/profileupdate", authMiddleware, profileUpdateController);

module.exports = router;
