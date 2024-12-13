const mongoose = require("mongoose");

const walletDiscountSchema = new mongoose.Schema(
  {
    discount: {
      type: Number,
    },
    status: {
      type: Boolean,
    },
  },
  {
    timestamps: true,
  }
);

const walletDiscountModel = mongoose.model(
  "walletDiscount",
  walletDiscountSchema
);
module.exports = walletDiscountModel;
