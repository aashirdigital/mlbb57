const walletHistoryModel = require("../models/walletHistoryModel");

const addWalletHistoryController = async (req, res) => {
  try {
    const history = await walletHistoryModel.findOne({
      orderId: req.body.orderId,
    });
    if (history) {
      return res.status(201).send({
        success: false,
        message: "History already present",
      });
    }
    const newHistory = new walletHistoryModel(req.body);
    await newHistory.save();
    return res.status(200).send({
      success: true,
      message: "History Save Success",
    });
  } catch (error) {
    return res.status(500).send({
      message: error.message,
      success: false,
    });
  }
};

const getWalletHistoryController = async (req, res) => {
  try {
    const history = await walletHistoryModel.find({
      mobile: req.body.mobile,
    });
    if (history.length === 0) {
      return res.status(201).send({
        success: false,
        message: "No wallet history found",
      });
    }
    return res.status(200).send({
      success: true,
      data: history,
    });
  } catch (error) {
    return res.status(500).send({
      message: error.message,
      success: false,
    });
  }
};

const getAddMoneyHistoryAdmin = async (req, res) => {
  try {
    const history = await walletHistoryModel.find({});
    if (history.length === 0) {
      return res.status(201).send({
        success: false,
        message: "No wallet history found",
      });
    }
    return res.status(200).send({
      success: true,
      data: history,
    });
  } catch (error) {
    return res.status(500).send({
      message: error.message,
      success: false,
    });
  }
};

module.exports = {
  addWalletHistoryController,
  getWalletHistoryController,
  getAddMoneyHistoryAdmin,
};
