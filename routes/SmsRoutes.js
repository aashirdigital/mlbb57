const express = require("express");
const sendSMS = require("../controllers/sendSMS");

// router object
const router = express.Router();

router.post("/sendSMS", async (req, res) => {
  const { email, mobile } = req.body;
  const OTP = Math.floor(100000 + Math.random() * 900000);
  try {
    const response = await sendSMS(OTP, mobile);
    if (response) {
    }
    res.json({ success: true, message: "SMS sent successfully!" });
  } catch (error) {
    console.error("Error sending SMS", error);
    res.status(500).json({ success: false, message: "Error sending SMS." });
  }
});

module.exports = router;
