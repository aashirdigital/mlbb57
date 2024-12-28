const mongoose = require("mongoose");

const errSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
    },
    message: {
      type: String,
    },
    error: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const errModel = mongoose.model("error", errSchema);
module.exports = errModel;
