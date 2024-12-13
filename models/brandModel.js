const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema({
  name: String,
  models: Array,
});

const brandModel = mongoose.model("brand", brandSchema);
module.exports = brandModel;
