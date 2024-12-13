const mongoose = require("mongoose");

const paymentModeSchema = new mongoose.Schema({
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

const paymentModeModel = mongoose.model("paymentMode", paymentModeSchema);
module.exports = paymentModeModel;
