const mongoose = require("mongoose");

const barcodeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "email is required"],
  },
  amount: {
    type: Number,
    required: [true, "amount is requried"],
  },
  wanumber: {
    type: Number,
  },
  txnId: {
    type: String,
    required: [true, "Txn Id is requried"],
  },
  status: {
    type: String,
    default: "pending",
  },
  created: {
    type: Date,
    default: Date.now(),
  },
});

const barcodeModel = mongoose.model("barcode", barcodeSchema);
module.exports = barcodeModel;
