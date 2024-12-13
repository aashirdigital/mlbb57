const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "email is required"],
  },
  password: {
    type: String,
    required: [true, "password is required"],
  },
});

const adminModel = mongoose.model("admin", adminSchema);
module.exports = adminModel;
