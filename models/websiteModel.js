const mongoose = require("mongoose");

const webSchema = new mongoose.Schema({
  email: {
    type: String,
    default: "admin@gmail.com",
  },
  website: {
    type: Boolean,
    default: true,
  },
});

const webModel = mongoose.model("website", webSchema);
module.exports = webModel;
