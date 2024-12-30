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

// Admin callback
const adminController = async (req, res) => {
  try {
    const user = await userModel.findOne({ mobile: req.body.mobile });
    if (!user) {
      return res
        .status(200)
        .send({ success: false, message: "User not found" });
    }

    const isAdmin = user.isAdmin || false; // If isAdmin is undefined, default to false

    const token = jwt.sign({ id: user._id, isAdmin }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    return res
      .status(200)
      .send({ success: true, message: "Login Successful", token });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: true,
      message: `Login Controller ${error.message}`,
    });
  }
};

// register callback
const registerController = async (req, res) => {
  try {
    const existingUser = await userModel.findOne({
      $or: [{ email: req.body.email }, { mobile: req.body.mobile }],
    });
    if (existingUser) {
      const message =
        existingUser.email === req.body.email
          ? "Email Already Exists"
          : "Mobile Number Already Exists";
      return res.status(200).send({ success: false, message });
    }
    if (req.body.balance || req.body.isAdmin || req.body.reseller) {
      return res
        .status(201)
        .send({ success: false, message: "Failed to Register" });
    }
    const password = req.body.password;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    req.body.password = hashedPassword;
    const newUser = new userModel({
      ...req.body,
      mobileVerified: true,
      emailVerified: true,
    });
    await newUser.save();
    res.status(201).send({ success: true, message: "Registration Successful" });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: `Register Controller ${error.message}`,
    });
  }
};

// const loginController = async (req, res) => {
//   try {
//     const user = await userModel.findOne({ email: req.body.email });
//     if (!user) {
//       return res
//         .status(200)
//         .send({ success: false, message: "User not found" });
//     }
//     const isMatch = await bcrypt.compare(req.body.password, user.password);
//     if (!isMatch) {
//       return res
//         .status(200)
//         .send({ success: false, message: "Invalid Credentials" });
//     }
//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
//       expiresIn: "30d",
//     });

//     if (isMatch) {
//       user.lastLogin = new Date();
//       await user.save();
//     }
//     return res
//       .status(200)
//       .send({ success: true, message: "Login Successful", token });
//   } catch (error) {
//     console.log(error);
//     res.status(500).send({
//       success: true,
//       message: `Login Controller ${error.message}`,
//     });
//   }
// };

// Auth Callback
const loginController = async (req, res) => {
  try {
    let user = await userModel.findOne({ mobile: req.body.mobile });
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
    const { password, balance, mobile, isAdmin, ...data } = req.body;
    const userExist = await userModel.findOne({ mobile });

    if (!userExist) {
      return res.status(200).send({
        success: false,
        message: "User Not Found",
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
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).send({
      success: false,
      message: `User Profile Update Ctrl ${error.message}`,
    });
  }
};

// Send Mail
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
// Verify Email OTP
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

// send mobile sms otp
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

const verifyMobileController = async (req, res) => {
  const message =
    req.body.message === "Profile"
      ? "Profile Created Successfully"
      : "Mobile Verified Successfully";
  try {
    const userExist = await userModel.findOne({ email: req.body.email });
    if (!userExist) {
      return res
        .status(200)
        .send({ success: false, message: "User Not Found" });
    }

    if (userExist.mobileOtp !== req.body.otp) {
      return res.status(200).send({ success: false, message: "Incorrect OTP" });
    } else {
      const updateUser = await userModel.findOneAndUpdate(
        { email: req.body.email },
        { $set: { mobileVerified: "Yes" } },
        { new: true }
      );
      if (!updateUser) {
        return res
          .status(200)
          .send({ success: false, message: "Failed to Verify" });
      }
      return res.status(202).send({
        success: true,
        message: message,
        data: updateUser,
      });
    }
  } catch (error) {
    res
      .status(500)
      .send({ success: false, message: `Verify Mobile Ctrl ${error.message}` });
  }
};

const updatePassController = async (req, res) => {
  try {
    const userExist = await userModel.findOne({ email: req.body.email });
    if (!userExist) {
      return res
        .status(200)
        .send({ success: false, message: "User Not Found" });
    }
    const password = req.body.pass;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = await userModel.findOneAndUpdate(
      { email: req.body.email },
      { $set: { password: hashedPassword } },
      { new: true }
    );
    if (!user) {
      return res
        .status(201)
        .send({ success: false, message: "Failed to update password" });
    }
    res
      .status(202)
      .send({ success: true, message: "Password Updated Successfully" });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: `Update Pass Controller ${error.message}`,
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

const sendOtpController = async (req, res) => {
  try {
    const { mobile } = req.body;

    const otp = generateOTP(4);
    const response = await sendSMS(mobile, otp);
    const encryptedOTP = encrypt(otp, key, iv);

    if (response.success) {
      return res.status(200).send({
        success: true,
        message: "OTPs sent successfully",
        data: {
          otp: encryptedOTP,
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
    console.log(error);
    res.status(500).send({
      success: true,
      message: `Login Controller ${error.message}`,
    });
  }
};

const profileUpdateController = async (req, res) => {
  try {
    const { email, mobile, fname } = req.body;

    const user = await userModel.findOne({ mobile: mobile });
    if (!user) {
      return res.status(201).send({ success: true, message: "User not found" });
    }

    if (req.body.balance) {
      return res.status(201).send({ success: true, message: "Error Updating" });
    }

    const updateUser = await userModel.findOneAndUpdate(
      { mobile: mobile },
      { $set: { email: email, fname: fname } },
      { new: true }
    );

    if (!updateUser) {
      return res
        .status(201)
        .send({ success: true, message: "Failed to update" });
    }

    return res.status(200).send({
      success: true,
      message: "Profile Updated Successfully",
    });
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
  registerController,
  authController,
  sendMailController,
  verifyOtpController,
  updatePassController,
  verifyMobileController,
  sendSMSController,
  adminController,
  userProfileUpdateController,
  sendMobileOtpController,
  leaderboardController,
  sendOtpController,
  profileUpdateController,
};
