const cron = require("node-cron");
const saveLeaderboardData = require("./routes/leaderboardRoutes");

const startCronJobs = () => {
  // Schedule the cron job to run daily at midnight
  cron.schedule("0 0 * * *", async () => {
    console.log("Running leaderboard save task...");
    await saveLeaderboardData();
  });
  console.log("Cron jobs scheduled successfully!");
};

module.exports = startCronJobs;
