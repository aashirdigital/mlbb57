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

// In-memory dictionary to store usage count (replace with a more persistent solution)
const usageCount = {};

// Create a rate limiter with specific options
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: "Too many requests from this IP, please try again later.",
});

// Routes
router.post("/login", loginController);
router.post("/getUserData", authMiddleware, authController);
router.post("/send-otp", sendMailController);
router.post("/verify-otp", verifyOtpController);
router.get("/leaderboard", leaderboardController);
router.post("/updateprofile", authMiddleware, userProfileUpdateController);
router.post("/mobileotp", limiter, mobileOtpController);

// router.post(
//   "/mobileotp",
//   (req, res, next) => {
//     const deviceId = req.headers["device-id"]; // Get device ID from request header
//     if (!usageCount[deviceId]) {
//       usageCount[deviceId] = 0;
//     }
//     usageCount[deviceId] += 1;
//     if (usageCount[deviceId] > 3) {
//       return res
//         .status(429)
//         .json({ message: "Device blocked due to excessive usage" });
//     }
//     next();
//   },
//   mobileOtpController
// );

module.exports = router;
