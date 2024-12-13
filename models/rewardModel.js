const mongoose = require("mongoose");

const rewardSchema = new mongoose.Schema({
  position: {
    type: String,
  },
  reward: {
    type: String,
  },
  desc: {
    type: String,
  },
});

const rewardModel = mongoose.model("reward", rewardSchema);
module.exports = rewardModel;
