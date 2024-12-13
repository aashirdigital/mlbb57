const mongoose = require("mongoose");

const gallerySchema = new mongoose.Schema({
  image: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

const galleryModel = mongoose.model("gallery", gallerySchema);
module.exports = galleryModel;
