const mongoose = require("mongoose");
const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    amount: {
      type: String,
      required: true,
    },
    mobile: {
      type: String,
      required: true,
    },
    status: {
      type: String,
    },
    txnId: {
      type: String,
    },
    payerUpi: {
      type: String,
    },
    type: {
      type: String,
    },
    pname: {
      type: String,
    },
    payDate: {
      type: Date,
      default: Date.now(),
    },
  },
  {
    timestamps: true,
  }
);

const paymentModel = mongoose.model("payments", paymentSchema);
module.exports = paymentModel;
