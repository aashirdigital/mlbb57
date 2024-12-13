const mongoose = require("mongoose");

const walletBarcodeSchema = new mongoose.Schema(
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
    amount: {
      type: String,
    },
    utr: {
      type: String,
    },
    status: {
      type: String,
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

const walletBarcodeModel = mongoose.model("walletBarcode", walletBarcodeSchema);
module.exports = walletBarcodeModel;
