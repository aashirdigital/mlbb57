const mongoose = require("mongoose");

const walletHistorySchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
    },
    email: {
      type: String,
    },
    mobile: {
      type: String,
    },
    balanceBefore: {
      type: String,
    },
    balanceAfter: {
      type: String,
    },
    amount: {
      type: String,
    },
    product: {
      type: String,
    },
    type: {
      type: String,
    },
    reason: {
      type: String,
      default: null,
    },
    admin: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const walletHistoryModel = mongoose.model("walletHistory", walletHistorySchema);
module.exports = walletHistoryModel;
