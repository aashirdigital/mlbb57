const axios = require("axios");

const sendSMS = async (phone, otp) => {
  try {
    const otpString = otp.toString();
    if (otpString.length !== 4) {
      console.error("Error: OTP must be 4 digits long.");
      return { success: false, message: "OTP must be 4 digits long." };
    }
    const url = `https://sms.renflair.in/V1.php?API=${process.env.SMS_API_KEY}&PHONE=${phone}&OTP=${otpString}`;
    const response = await axios.get(url);
    if (response.data.status === "SUCCESS") {
      return {
        success: true,
        message: "OTP sent successfully",
      };
    } else {
      return {
        success: false,
        message: "Failed to send OTP",
      };
    }
  } catch (error) {
    console.error("Error:", error);
    return {
      success: false,
      message: "An error occurred while sending OTP",
    };
  }
};

module.exports = sendSMS;
