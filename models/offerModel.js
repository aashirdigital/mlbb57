const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema({
  shippingCharge: {
    type: Number,
    default: 0,
  },
  coupons: {
    type: Array,
    default: [],
  },
});

const offerModel = mongoose.model("offer", offerSchema);
module.exports = offerModel;
