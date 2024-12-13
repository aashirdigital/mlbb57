const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Product name is required"],
  },
  image: {
    type: String,
  },
  cost: {
    type: Array,
    required: [true, "Product price is required"],
  },
  desc: {
    type: String,
  },
  descTwo: {
    type: String,
  },
  api: {
    type: String,
    default: "no",
  },
  category: {
    type: String,
  },
  apiName: {
    type: String,
    default: "manual",
  },
  gameName: {
    type: String,
  },
  region: {
    type: String,
  },
  tag: {
    type: String,
    default: "none",
  },
  stock: {
    type: String,
    default: "yes",
  },
  fields: {
    type: String,
  },
  tagOne: {
    type: String,
    default: "USER ID",
  },
  tagTwo: {
    type: String,
    default: "ZONE ID",
  },
  playerCheckBtn: {
    type: String,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
});

const productModel = mongoose.model("product", productSchema);
module.exports = productModel;
