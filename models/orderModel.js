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
    discountedPrice: {
      type: String,
    },
    customer_email: {
      type: String,
    },
    customer_mobile: {
      type: String,
    },
    inGameName: {
      type: String,
      default: null,
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
    loopCount: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const orderModel = mongoose.model("order", orderSchema);
module.exports = orderModel;
