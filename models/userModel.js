const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    isAdmin: {
      type: Boolean,
      default: false,
    },
    email: {
      type: String,
      default: null,
    },
    fname: {
      type: String,
      default: null,
    },
    mobile: {
      type: String,
      unique: true,
    },
    gender: {
      type: String,
    },
    state: {
      type: String,
    },
    balance: {
      type: Number,
      default: 0,
    },
    emailOtp: {
      type: String,
    },
    mobileOtp: {
      type: String,
    },
    otpAttemps: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    reseller: {
      type: String,
      default: "no",
    },
    mobileVerified: {
      type: Boolean,
      default: false,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    block: {
      type: String,
      default: "no",
    },
  },
  {
    timestamps: true,
  }
);

const userModel = mongoose.model("users", userSchema);
module.exports = userModel;
