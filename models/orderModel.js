const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
    },
    api: {
      type: String,
    },
    amount: {
      type: String,
    },
    pname: {
      type: String,
    },
    price: {
      type: String,
    },
    customer_email: {
      type: String,
    },
    customer_mobile: {
      type: String,
    },
    userId: {
      type: String,
      default: null,
    },
    zoneId: {
      type: String,
      default: null,
    },
    prodId: {
      type: String,
    },
    status: {
      type: String,
      default: "pending",
    },
    paymentMode: {
      type: String,
    },
    apiName: {
      type: String,
    },
    originalPrice: {
      type: String,
    },
    productId: {
      type: String,
    },
    region: {
      type: String,
    },
    gameId: {
      type: String,
    },
    discount: {
      type: String,
    },
    sid: {
      type: String,
    },
    mid: {
      type: String,
    },
    yid: {
      type: String,
    },
    utr: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const orderModel = mongoose.model("order", orderSchema);
module.exports = orderModel;
