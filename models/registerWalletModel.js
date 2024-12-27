const mongoose = require("mongoose");

const registerWalletSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
    },
    amount: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

const registerWalletModel = mongoose.model(
  "registerWallet",
  registerWalletSchema
);
module.exports = registerWalletModel;
