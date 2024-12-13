const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema({
  fname: {
    type: String,
    required: [true, "name is required"],
  },
  email: {
    type: String,
    required: [true, "email is required"],
  },
  mobile: {
    type: String,
    required: [true, "mobile is required"],
  },
  msg: {
    type: Array,
  },
  type: {
    type: String,
    default: "others",
  },
  seen: {
    type: Boolean,
    default: true,
  },
  status: {
    type: String,
    default: "pending",
  },
});

const contactModel = mongoose.model("contact", contactSchema);
module.exports = contactModel;
