const express = require("express");
const axios = require("axios");
const Leaderboard = require("../models/leaderboardModel");
const leaderboardModel = require("../models/leaderboardModel");
const rewardModel = require("../models/rewardModel");
const { getCurrentDateRange } = require("../utils/dateUtils");
const adminAuthMiddleware = require("../middlewares/adminAuthMiddleware");

const router = express.Router();

// Save the leaderboard data when the date range ends
const saveLeaderboardData = async () => {
  const { startDate, endDate } = getCurrentDateRange();

  console.log(endDate);

  // Get the current date in the same format as `endDate`
  const today = new Date().toISOString().split("T")[0];

  // Check if today matches the endDate
  if (today !== endDate) {
    console.log(
      "Today is not the end date of the current range. Skipping save."
    );
    return;
  }

  try {
    // Fetch leaderboard data
    const res = await axios.get(
      `http://localhost:8080/api/user/leaderboard?startDate=${startDate}&endDate=${endDate}`
    );

    if (res.data.success) {
      // Save to database
      const winners = res.data.data.map((item) => ({
        fname: item.fname.replace("@gmail.com", ""),
        score: item.score, // Ensure the score field exists in the API response
      }));

      const leaderboardEntry = new Leaderboard({
        winners,
        fromDate: startDate,
        toDate: endDate,
      });

      await leaderboardEntry.save();
      console.log("Leaderboard data saved successfully!");
    } else {
      console.error("Failed to fetch leaderboard data:", res.data.message);
    }
  } catch (error) {
    console.error("Error saving leaderboard data:", error.message);
  }
};

router.get("/get-leaderboard-rewards", async (req, res) => {
  try {
    const rewardList = await leaderboardModel.find({});
    if (!rewardList || rewardList.length === 0) {
      return res
        .status(201)
        .send({ success: false, error: "No reward list found" });
    }
    return res.status(200).send({
      success: true,
      error: "Reward list fetched success",
      data: rewardList,
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).send({ error: error.message });
  }
});

// REWARD ROUTES
router.get("/get-rewards", async (req, res) => {
  try {
    const rewards = await rewardModel.find({});
    if (!rewards || rewards.length === 0) {
      return res
        .status(201)
        .send({ success: false, message: "No rewards found" });
    }
    return res.status(200).send({
      success: true,
      message: "Rewards fetched success",
      data: rewards,
    });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});
router.post("/add-reward", adminAuthMiddleware, async (req, res) => {
  try {
    const newReward = new rewardModel(req.body);
    await newReward.save();
    return res
      .status(200)
      .send({ success: true, message: "Reward added success" });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});
router.post("/delete-reward", adminAuthMiddleware, async (req, res) => {
  try {
    if (!req.body.id) {
      return res
        .status(201)
        .send({ success: false, message: "id is required to delete" });
    }
    const deleteReward = await rewardModel.findOneAndDelete({
      _id: req.body.id,
    });
    if (!deleteReward) {
      return res
        .status(201)
        .send({ success: false, message: "Failed to delete reward" });
    }
    return res.status(200).send({ success: true, message: "Reward deleted" });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});

module.exports = router;
