const axios = require("axios");

const sendSMS = async (phone, otp) => {
  try {
    const url = `https://backend.oneapi.in/sms/sendotp`;
    const data = {
      apiKey: process.env.ONEAPI_KEY,
      brandName: "Arch Official",
      customerName: "Welcome to Arch Official",
      number: phone,
      otp: otp,
    };
    const response = await axios.post(url, data);

    if (response.data.success) {
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
