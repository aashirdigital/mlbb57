const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  image: {
    type: String,
  },
  popupImage: {
    type: String,
  },
  popupImageStatus: {
    type: String,
  },
  link: {
    type: String,
  },
  display: {
    type: String,
  },
  desc: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

const notificationModel = mongoose.model("notification", notificationSchema);
module.exports = notificationModel;
