const express = require("express");
const browserMiddleware = require("../middlewares/browserMiddleware");
const sendMail = require("../controllers/sendMail");
const sendSMS = require("../controllers/sendSMS");
const crypto = require("crypto");
const userModel = require("../models/userModel");

// router object
const router = express.Router();

// generate OTP
function generateOTP(digits) {
  const multiplier = Math.pow(10, digits - 1);
  const otp = Math.floor(
    multiplier + Math.random() * 9 * multiplier
  ).toString();
  return otp;
}
// Encrypt OTP
function encrypt(text, key, iv) {
  let cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return encrypted.toString("hex");
}
// Define your encryption key and initialization vector
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

router.post("/send-email-otp", browserMiddleware, async (req, res) => {
  try {
    const { email } = req.body;

    const existingUser = await userModel.findOne({ email: email });
    if (!existingUser) {
      return res.status(201).send({
        success: false,
        message: "Incorrect Email",
      });
    }

    // EMAIL OTP
    const emailOtp = generateOTP(6);
    const encryptedEmailOTP = encrypt(emailOtp, key, iv);
    const response = await sendMail(
      email,
      "Email Verification OTP",
      emailOtp,
      "Your Email Verification OTP is - "
    );

    if (response.success) {
      return res.status(200).send({
        success: true,
        message: "OTP sent successfully on Email",
        data: {
          emailOtp: encryptedEmailOTP,
          key: key.toString("hex"),
          iv: iv.toString("hex"),
        },
      });
    } else {
      return res.status(201).send({
        success: false,
        message: response.message,
      });
    }
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
});

router.post("/verify-email-otp", browserMiddleware, async (req, res) => {
  try {
    const { email } = req.body;

    const existingUser = await userModel.findOne({ email: email });
    if (!existingUser) {
      return res.status(201).send({
        success: false,
        message: "Incorrect Email",
      });
    }

    const updateUser = await userModel.findOneAndUpdate(
      { email: email },
      { $set: { emailVerified: true } },
      { new: true }
    );

    if (!updateUser) {
      return res
        .status(202)
        .send({ success: false, message: "Failed to Verify" });
    }
    return res.status(200).send({
      success: true,
      message: "Email Verified Successfully",
      data: updateUser,
    });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
});

router.post("/send-mobile-otp", browserMiddleware, async (req, res) => {
  try {
    const { mobile } = req.body;

    const existingUser = await userModel.findOne({ mobile: mobile });
    if (!existingUser) {
      return res.status(201).send({
        success: false,
        message: "Incorrect Mobile",
      });
    }

    // MOBILE OTP
    const otp = generateOTP(4);
    const response = await sendSMS(mobile, otp);
    const encryptedMobileOTP = encrypt(otp, key, iv);

    if (response.success) {
      return res.status(200).send({
        success: true,
        message: "OTP sent successfully on Mobile",
        data: {
          mobileOtp: encryptedMobileOTP,
          key: key.toString("hex"),
          iv: iv.toString("hex"),
        },
      });
    } else {
      return res.status(201).send({
        success: false,
        message: response.message,
      });
    }
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
});

router.post("/verify-mobile-otp", browserMiddleware, async (req, res) => {
  try {
    const { mobile } = req.body;

    const existingUser = await userModel.findOne({ mobile: mobile });
    if (!existingUser) {
      return res.status(201).send({
        success: false,
        message: "Incorrect Mobile",
      });
    }

    const updateUser = await userModel.findOneAndUpdate(
      { mobile: mobile },
      { $set: { mobileVerified: true } },
      { new: true }
    );

    if (!updateUser) {
      return res
        .status(202)
        .send({ success: false, message: "Failed to Verify" });
    }
    return res.status(200).send({
      success: true,
      message: "Mobile Verified Successfully",
      data: updateUser,
    });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
});

module.exports = router;
