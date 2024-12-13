const mongoose = require("mongoose");

const leaderboardSchema = new mongoose.Schema({
  winners: {
    type: Array,
  },
  fromDate: {
    type: String,
  },
  toDate: {
    type: String,
  },
  status: {
    type: String,
    default: null,
  },
});

const leaderboardModel = mongoose.model("leaderboard", leaderboardSchema);
module.exports = leaderboardModel;
