const mongoose = require("mongoose");

const confirmSchema = new mongoose.Schema({
  orderId: {
    type: String,
  },
  status: {
    type: String,
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

const confirmModel = mongoose.model("confirm", confirmSchema);
module.exports = confirmModel;
