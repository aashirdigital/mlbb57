const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "name is required"],
  },
  discount: {
    type: Number,
    required: [true, "discount is required"],
  },
  minValue: {
    type: Number,
    required: [true, "Min Order Value is required"],
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

const couponModel = mongoose.model("coupon", couponSchema);
module.exports = couponModel;
