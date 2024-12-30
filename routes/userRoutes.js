const express = require("express");
const {
  loginController,
  registerController,
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
const browserMiddleware = require("../middlewares/browserMiddleware");

// router object
const router = express.Router();
// routes
router.post("/admin", adminController);
router.post("/login", loginController);
// router.post("/register", registerController);
router.post("/updateprofile", authMiddleware, userProfileUpdateController);
router.post("/getUserData", authMiddleware, authController);
router.post("/send-otp", sendMailController);
router.post("/verify-otp", verifyOtpController);
router.post("/update-pass", updatePassController);
router.post("/send-mobile-otp", sendMobileOtpController);
router.get("/leaderboard", leaderboardController);
// OTP
router.post("/sendotp", sendOtpController);
router.post("/profileupdate", authMiddleware, profileUpdateController);

// router.post("/get-payment-method", browserMiddleware, getUserPaymentDetailsController);

module.exports = router;
