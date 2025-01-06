const express = require("express");
const axios = require("axios");
const paymentModel = require("../models/paymentModel");
const walletBarcodePayment = require("../models/walletBarcodePayment");
const walletHistoryModel = require("../models/walletHistoryModel");
const userModel = require("../models/userModel");
const walletDiscountModel = require("../models/walletDiscountModel");
const authMiddleware = require("../middlewares/authMiddleware");
const adminAuthMiddleware = require("../middlewares/adminAuthMiddleware");
const router = express.Router();

//barcode add money
router.get("/getbarcode", adminAuthMiddleware, async (req, res) => {
  try {
    const barcodeHistories = await walletBarcodePayment.find({});
    if (!barcodeHistories || barcodeHistories.length === 0) {
      return res
        .status(201)
        .send({ success: false, message: "No payment found" });
    }
    return res.status(200).send({
      success: true,
      message: "Payment fetched",
      data: barcodeHistories,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: error.message });
  }
});
router.post("/barcode", authMiddleware, async (req, res) => {
  try {
    const { orderId, email, mobile, amount, utr } = req.body;

    // checking user
    const user = await userModel.findOne({ email: email });
    if (!user) {
      return res
        .status(201)
        .send({ success: false, message: "Unauthorised access" });
    }

    const txn = await walletBarcodePayment.findOne({
      utr: utr,
      status: "success",
    });
    if (txn) {
      return res
        .status(201)
        .send({ success: false, message: "Transaction already in process" });
    }

    // saving payment
    const newTxn = new walletBarcodePayment(req.body);
    await newTxn.save();

    // saving wallet history
    const newBalance = Math.max(
      0,
      parseFloat(user?.balance) + parseFloat(amount)
    );
    const newHistory = new walletHistoryModel({
      orderId: orderId,
      email: email,
      balanceBefore: user?.balance,
      balanceAfter: newBalance,
      amount: amount,
      product: "Wallet",
      type: "pending",
    });
    await newHistory.save();

    return res
      .status(200)
      .send({ success: true, message: "Payment succcessfully sent" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// verify payment
router.post("/verify", adminAuthMiddleware, async (req, res) => {
  try {
    const { utr, email, orderId } = req.body;
    // checking user
    const user = await userModel.findOne({ email: email });
    if (!user) {
      return res
        .status(201)
        .send({ success: false, message: "Unauthorised access" });
    }
    const txn = await walletBarcodePayment.findOne({
      utr: utr,
      status: "success",
    });
    if (txn) {
      return res
        .status(201)
        .send({ success: false, message: "Transaction already success" });
    }

    const updateTxn = await walletBarcodePayment.findOneAndUpdate(
      { utr: utr },
      { $set: { status: "success" } },
      { new: true }
    );
    if (!updateTxn) {
      return res
        .status(201)
        .send({ success: false, message: "Failed to update" });
    }
    const walletHistory = await walletHistoryModel.findOne({
      orderId: orderId,
    });
    if (!walletHistory) {
      return res
        .status(201)
        .send({ success: false, message: "Wallet History Not Found" });
    }
    const updateWalletHistory = await walletHistoryModel.findOneAndUpdate(
      {
        orderId: orderId,
      },
      { $set: { type: "addmoney" } },
      { new: true }
    );
    if (!updateWalletHistory) {
      return res
        .status(201)
        .send({ success: false, message: "Failed to update wallet history" });
    }

    const newBalance = Math.max(
      0,
      parseFloat(user?.balance) + parseFloat(walletHistory.amount)
    );
    const updateBalance = await userModel.findOneAndUpdate(
      { email: email },
      { $set: { balance: newBalance } },
      { new: true }
    );
    if (!updateBalance) {
      return res
        .status(201)
        .send({ success: false, message: "Failed to update user balance" });
    }

    return res
      .status(200)
      .send({ success: true, message: "Payment Verified and balance added" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// add money to wallet
router.post("/addmoney", authMiddleware, async (req, res) => {
  try {
    const {
      orderId,
      amount,
      paymentNote,
      customerName,
      customerEmail,
      customerNumber,
    } = req.body;

    // Proceeding with the payment initiation
    const response = await axios.post(
      "https://backend.onegateway.in/payment/initiate",
      {
        apiKey: process.env.ONEGATEWAY_API_KEY,
        scannerIncluded: true,
        orderId,
        amount: amount,
        paymentNote,
        customerName,
        customerEmail,
        customerNumber,
        redirectUrl: `https://coinsup.in/api/wallet/status`,
      }
    );
    if (response.data && response.data.success) {
      console.log(response.data);
      return res.status(200).send({ success: true, data: response.data.data });
    } else {
      return res
        .status(201)
        .send({ success: false, data: "Error in initiating payment" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
router.get("/status", async (req, res) => {
  try {
    const { orderId } = req.query;

    const existingPayment = await paymentModel.findOne({
      orderId: orderId,
    });
    if (existingPayment) {
      return res.redirect(`${process.env.BASE_URL}/failure`);
    }

    const paymentResponse = await axios.post(
      "https://pay.onegateway.in/payment/status",
      {
        apiKey: process.env.ONEGATEWAY_API_KEY,
        orderId: orderId,
      }
    );

    // Check if the order ID is found
    if (paymentResponse.data.success) {
      const data = paymentResponse.data.data;
      if (data.status === "success") {
        const {
          orderId,
          paymentNote,
          customerName,
          customerEmail,
          customerNumber,
          amount,
          utr,
        } = data;

        // saving payment
        const paymentObject = {
          name: customerName,
          email: customerEmail,
          mobile: customerNumber,
          amount: amount,
          orderId: orderId,
          status: data.status,
          txnId: utr,
          type: "wallet",
        };
        const newPayment = new paymentModel(paymentObject);
        await newPayment.save();

        const user = await userModel.findOne({
          email: customerEmail,
        });

        if (!user) {
          return res.redirect(`${process.env.BASE_URL}/failure`);
        }

        // udpating user balance
        const updatedUser = await userModel.findOneAndUpdate(
          { email: customerEmail },
          {
            $set: {
              balance: parseFloat(user.balance) + parseFloat(data.amount),
            },
          },
          { new: true }
        );
        if (updatedUser) {
          // saving wallet history
          const newBalance = Math.max(
            0,
            parseFloat(user?.balance) + parseFloat(data.amount)
          );
          const newHistory = new walletHistoryModel({
            orderId: orderId,
            email: customerEmail,
            mobile: customerNumber,
            balanceBefore: user?.balance,
            balanceAfter: newBalance,
            amount: data.amount,
            product: "Wallet",
            type: "addmoney",
          });
          await newHistory.save();

          return res.redirect(`${process.env.BASE_URL}/success`);
        }
      }
    } else {
      console.error("OrderID Not Found");
      return res.status(404).json({ error: "OrderID Not Found" });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
});

// discount
router.get("/getdiscount", async (req, res) => {
  try {
    const discount = await walletDiscountModel.findOne({});
    if (!discount) {
      return res.status(201).send({
        success: false,
        message: "No Discount Set",
      });
    }
    return res.status(200).send({
      success: true,
      message: "Discount fetched success",
      data: discount,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
});
router.post("/discount", adminAuthMiddleware, async (req, res) => {
  try {
    const discount = await walletDiscountModel.findOne({});
    if (!discount) {
      const newDiscount = new walletDiscountModel(req.body);
      await newDiscount.save();
    }
    const updateDiscount = await walletDiscountModel.findOneAndUpdate(req.body);
    if (!updateDiscount) {
      return res.status(201).send({
        success: false,
        message: "Failed to update",
      });
    }
    return res.status(200).send({
      success: true,
      message: "Discount Updated",
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
