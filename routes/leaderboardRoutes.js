const express = require("express");
const axios = require("axios");
const Leaderboard = require("../models/leaderboardModel");
const leaderboardModel = require("../models/leaderboardModel");
const rewardModel = require("../models/rewardModel.js");
const orderModel = require("../models/orderModel");
const adminAuthMiddleware = require("../middlewares/adminAuthMiddleware");
const nodeCron = require("node-cron");
const router = express.Router();

// Save the leaderboard data when the date range ends
const saveLeaderboardData = async () => {
  try {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const currentDate = now.toISOString().split("T")[0];
    // Check if today is the last day of the month
    // if (currentDate !== endDate) {
    //   console.log("Today is not the last day of the month. Skipping save.");
    //   return;
    // }

    // fetching rewards
    const rewards = await rewardModel.find({});

    // Fetch leaderboard data
    const topUsers = await orderModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
          status: "success",
        },
      },
      {
        $group: {
          _id: "$customer_email",
          totalSpent: { $sum: { $toDouble: "$price" } },
        },
      },
      {
        $sort: { totalSpent: -1 },
      },
      {
        $limit: 15,
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "email",
          as: "userInfo",
        },
      },
      {
        $unwind: "$userInfo",
      },
      {
        $project: {
          totalSpent: 1,
          fname: "$userInfo.fname",
          _id: 0,
        },
      },
    ]);

    // Prepare the winners array with prizes
    const winners = topUsers.map((item, index) => {
      // Find the reward for the current position
      const rewardForPosition = rewards.find(
        (reward) => reward.position === (index + 1).toString()
      );
      // If no reward is found for the current position, use the last available reward
      const prize = rewardForPosition
        ? rewardForPosition.reward
        : rewards[rewards.length - 1]?.reward || "No Prize";

      return {
        fname: item.fname.replace("@gmail.com", ""),
        score: item.totalSpent, // Ensure the score field exists in the API response
        prize,
      };
    });

    // Save to database
    const leaderboardEntry = new Leaderboard({
      winners,
      fromDate: startDate,
      toDate: endDate,
    });

    await leaderboardEntry.save();
    console.log("Monthly leaderboard data saved successfully!");
  } catch (error) {
    console.error("Error saving monthly leaderboard data:", error.message);
  }
};

// Schedule the function to run at 23:59 on the last day of every month
nodeCron.schedule("59 23 28-31 * *", async () => {
  const now = new Date();
  const lastDayOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();
  if (now.getDate() === lastDayOfMonth) {
    console.log("Running monthly leaderboard task...");
    await saveLeaderboardData();
  }
});

// get leaderboard
router.get("/leaderboard", async (req, res) => {
  try {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const topUsers = await orderModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
          status: "success",
        },
      },
      {
        $group: {
          _id: "$customer_email",
          totalSpent: { $sum: { $toDouble: "$price" } },
        },
      },
      {
        $sort: { totalSpent: -1 },
      },
      {
        $limit: 15,
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "email",
          as: "userInfo",
        },
      },
      {
        $unwind: "$userInfo",
      },
      {
        $project: {
          totalSpent: 1,
          fname: "$userInfo.fname",
          _id: 0,
        },
      },
    ]);

    return res.status(200).send({
      success: true,
      data: topUsers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

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
