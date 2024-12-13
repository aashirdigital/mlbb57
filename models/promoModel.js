const mongoose = require("mongoose");

const promoSchema = new mongoose.Schema({
  image: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
});

const promoModel = mongoose.model("promo", promoSchema);
module.exports = promoModel;
