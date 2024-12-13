const mongoose = require("mongoose");

const walletPaymentModeSchema = new mongoose.Schema({
  paymentMode: {
    type: String,
    default: "barcode",
  },
  image: {
    type: String,
  },
  desc: {
    type: String,
  },
});

const walletPaymentModeModel = mongoose.model(
  "walletPaymentMode",
  walletPaymentModeSchema
);
module.exports = walletPaymentModeModel;
