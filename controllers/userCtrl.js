const userModel = require("../models/userModel");
const orderModel = require("../models/orderModel");
const axios = require("axios");
const subscribeModel = require("../models/subcribeModel");
const registerWalletModel = require("../models/registerWalletModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendMail = require("./sendMail");
const sendSMS = require("./sendSMS");
const crypto = require("crypto");

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

const loginController = async (req, res) => {
  try {
    let user = await userModel.findOne({ mobile: req.body.mobile });

    if (req.body.otp !== user?.mobileOtp) {
      return res.status(201).send({
        success: false,
        message: "Incorrect OTP",
      });
    }

    let userExist;
    if (!user) {
      userExist = "no";
      const randomBalance = Math.floor(Math.random() * 4);
      // saving user
      user = new userModel({
        mobile: req.body.mobile,
        isAdmin: false,
        balance: randomBalance,
        reseller: "no",
      });
      await user.save();
      // saving register wallet history
      const newHistory = new registerWalletModel({
        mobile: req.body.mobile,
        amount: randomBalance,
      });
      await newHistory.save();
    } else {
      userExist = "yes";
    }

    const isAdmin = user.isAdmin || false;

    // Generate token based on user (new or existing)
    const token = jwt.sign({ id: user._id, isAdmin }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    return res.status(200).send({
      success: true,
      message: "Login Successful",
      userExist: userExist,
      token,
      isAdmin,
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).send({
      success: false, // Set to false on error
      message: `Login Controller ${error.message}`,
    });
  }
};

const authController = async (req, res) => {
  try {
    const user = await userModel.findOne({ _id: req.body.userId });

    if (!user) {
      return res
        .status(200)
        .send({ success: false, message: "User Not Found" });
    } else {
      user.password = undefined;
      const id = encrypt(user?.balance.toString(), key, iv);
      user.balance = undefined;

      return res.status(200).send({
        success: true,
        data: {
          user,
          id,
          key: key.toString("hex"),
          iv: iv.toString("hex"),
        },
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({ success: false, message: "Auth Error", error });
  }
};

const userProfileUpdateController = async (req, res) => {
  try {
    const { userId, password, balance, mobile, isAdmin, ...data } = req.body;

    const userExist = await userModel.findOne({ _id: userId });

    if (!userExist) {
      return res.status(200).send({
        success: false,
        message: "User Not Found",
      });
    }

    if (userExist?.mobile === process.env.CLIENT_EMAIL) {
      return res.status(201).send({
        success: false,
        message: "you are not allowed to update the user data",
      });
    }

    const updateData = { ...data };

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updateData.password = hashedPassword;
    }

    const userUpdate = await userModel.findOneAndUpdate(
      { mobile },
      { $set: updateData }, // Exclude balance field
      { new: true }
    );

    if (!userUpdate) {
      return res.status(201).send({
        success: false,
        message: "Failed to update user profile",
      });
    }

    return res.status(202).send({
      success: true,
      message: "Profile Updated",
      user: userUpdate,
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).send({
      success: false,
      message: `User Profile Update Ctrl ${error.message}`,
    });
  }
};

const sendMailController = async (req, res) => {
  try {
    const user = await userModel.findOne({ email: req.body.email });
    if (!user) {
      return res
        .status(200)
        .send({ success: false, message: "Email Not Registered With Us" });
    }
    const emailOtp = Math.floor(100000 + Math.random() * 900000);
    const savedOtpUser = await userModel.findOneAndUpdate(
      { email: req.body.email },
      { $set: { emailOtp: emailOtp } },
      { new: true }
    );
    if (!savedOtpUser) {
      return res
        .status(201)
        .send({ success: false, message: "Error In saving Otp" });
    }
    await sendMail(
      savedOtpUser?.email,
      "Email Verification OTP",
      emailOtp,
      req.body.msg
    );
    return res.status(203).send({
      success: true,
      message: "Otp Send Successfully",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: `Send Mail Controller ${error.message}`,
    });
  }
};
const verifyOtpController = async (req, res) => {
  try {
    const user = await userModel.findOne({ email: req.body.email });
    if (!user) {
      return res
        .status(200)
        .send({ success: false, message: "User Not Found" });
    }
    if (user.emailOtp !== req.body.userEnteredOtp) {
      return res
        .status(201)
        .send({ success: false, message: "Failed: Incorrect OTP" });
    } else {
      const updateUser = await userModel.findOneAndUpdate(
        { email: req.body.email },
        { $set: { isActive: "Yes" } },
        { new: true }
      );
      if (!updateUser) {
        return res
          .status(200)
          .send({ success: false, message: "Failed to Verify" });
      }
      return res.status(202).send({
        success: true,
        message: "Email Verification Successful",
        data: user,
      });
    }
  } catch (error) {
    res.status(500).send({
      success: false,
      message: `Verify Otp Controller ${error.message}`,
    });
  }
};

const sendSMSController = async (req, res) => {
  try {
    const { email, mobile } = req.body;
    const user = await userModel.findOne({ email: email });
    if (!user) {
      return res
        .status(200)
        .send({ success: false, message: "Email Not Registered With Us" });
    }
    const smsOTP = Math.floor(100000 + Math.random() * 900000);
    await sendSMS(smsOTP, mobile);
    const savedOtpUser = await userModel.findOneAndUpdate(
      { email: email },
      { $set: { mobileOtp: smsOTP, mobile: mobile } },
      { new: true }
    );
    if (!savedOtpUser) {
      return res
        .status(201)
        .send({ success: false, message: "Error In saving Otp" });
    }
    return res.status(202).send({
      success: true,
      message: "Otp Send Successfully",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: `Send Mail Controller ${error.message}`,
    });
  }
};

const sendMobileOtpController = async (req, res) => {
  try {
    const { email, mobile } = req.body;
    const existingUser = await userModel.findOne({
      $or: [{ email: email }, { mobile: mobile }],
    });

    if (existingUser) {
      const msg = email === existingUser.email ? "Email" : "Mobile";
      return res
        .status(201)
        .send({ success: false, message: `${msg} Already registered with us` });
    }

    // MOBILE OTP
    const otp = generateOTP(4);
    const response = await sendSMS(mobile, otp);
    const encryptedOTP = encrypt(otp, key, iv);

    // EMAIL OTP
    const emailOtp = generateOTP(6);
    const emailResponse = await sendMail(
      email,
      "Email Veriification OTP",
      emailOtp,
      "Your Email Verification OTP is - "
    );
    const encryptedEmailOTP = encrypt(emailOtp, key, iv);

    if (response.success && emailResponse.success) {
      return res.status(200).send({
        success: true,
        message: "OTPs sent successfully",
        data: {
          otp: encryptedOTP,
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
    res.status(500).send({
      success: false,
      message: `Error: ${error.message}`,
    });
  }
};

const leaderboardController = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const from = new Date(startDate);
    const to = new Date(endDate);

    const topUsers = await orderModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: from,
            $lte: to,
          },
          status: "success",
        },
      },
      {
        $group: {
          _id: "$customer_email",
          totalSpent: { $sum: { $toDouble: "$price" } },
        },
      },
      {
        $sort: { totalSpent: -1 },
      },
      {
        $limit: 15,
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "email",
          as: "userInfo",
        },
      },
      {
        $unwind: "$userInfo",
      },
      {
        $project: {
          totalSpent: 1,
          fname: "$userInfo.fname",
          _id: 0,
        },
      },
    ]);

    return res.status(200).send({
      success: true,
      data: topUsers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const mobileOtpController = async (req, res) => {
  try {
    const { mobile } = req.body;

    const otp = generateOTP(4);
    const smsResponse = await sendSMS(mobile, otp);

    if (!smsResponse.success) {
      return res.status(500).send({
        success: false,
        message: smsResponse.message,
      });
    }

    const updatedUser = await userModel.findOneAndUpdate(
      { mobile: mobile },
      { $set: { mobileOtp: otp } },
      { new: true, upsert: true } // Upsert to create if not found
    );

    // Set emailOtpCreatedAt to null after 60 seconds
    setTimeout(async () => {
      await userModel.findOneAndUpdate(
        { _id: updatedUser._id },
        { $set: { mobileOtp: null } },
        { new: true }
      );
      console.log("otp expired");
    }, 60000); // 60 seconds

    if (updatedUser) {
      return res.status(200).send({
        success: true,
        message: "OTP sent successfully",
      });
    } else {
      return res.status(500).send({
        success: false,
        message: "Failed to save OTP in database",
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: true,
      message: `Login Controller ${error.message}`,
    });
  }
};

module.exports = {
  loginController,
  authController,
  sendMailController,
  verifyOtpController,
  sendSMSController,
  userProfileUpdateController,
  sendMobileOtpController,
  leaderboardController,
  mobileOtpController,
};
