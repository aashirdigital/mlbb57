const express = require("express");
const axios = require("axios");
const paymentModel = require("../models/paymentModel");
const walletBarcodePayment = require("../models/walletBarcodePayment");
const walletHistoryModel = require("../models/walletHistoryModel");
const userModel = require("../models/userModel");
const walletDiscountModel = require("../models/walletDiscountModel");
const authMiddleware = require("../middlewares/authMiddleware");
const adminAuthMiddleware = require("../middlewares/adminAuthMiddleware");
const cron = require("node-cron");
const router = express.Router();

//barcode add money
// router.get("/getbarcode", adminAuthMiddleware, async (req, res) => {
//   try {
//     const barcodeHistories = await walletBarcodePayment.find({});
//     if (!barcodeHistories || barcodeHistories.length === 0) {
//       return res
//         .status(201)
//         .send({ success: false, message: "No payment found" });
//     }
//     return res.status(200).send({
//       success: true,
//       message: "Payment fetched",
//       data: barcodeHistories,
//     });
//   } catch (error) {
//     console.log(error.message);
//     res.status(500).json({ error: error.message });
//   }
// });
// router.post("/barcode", authMiddleware, async (req, res) => {
//   try {
//     const { orderId, email, mobile, amount, utr } = req.body;

//     // checking user
//     const user = await userModel.findOne({ email: email });
//     if (!user) {
//       return res
//         .status(201)
//         .send({ success: false, message: "Unauthorised access" });
//     }

//     const txn = await walletBarcodePayment.findOne({
//       utr: utr,
//       status: "success",
//     });
//     if (txn) {
//       return res
//         .status(201)
//         .send({ success: false, message: "Transaction already in process" });
//     }

//     // saving payment
//     const newTxn = new walletBarcodePayment(req.body);
//     await newTxn.save();

//     // saving wallet history
//     const newBalance = Math.max(
//       0,
//       parseFloat(user?.balance) + parseFloat(amount)
//     );
//     const newHistory = new walletHistoryModel({
//       orderId: orderId,
//       email: email,
//       balanceBefore: user?.balance,
//       balanceAfter: newBalance,
//       amount: amount,
//       product: "Wallet",
//       type: "pending",
//     });
//     await newHistory.save();

//     return res
//       .status(200)
//       .send({ success: true, message: "Payment succcessfully sent" });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });
// // verify payment
// router.post("/verify", adminAuthMiddleware, async (req, res) => {
//   try {
//     const { utr, email, orderId } = req.body;
//     // checking user
//     const user = await userModel.findOne({ email: email });
//     if (!user) {
//       return res
//         .status(201)
//         .send({ success: false, message: "Unauthorised access" });
//     }
//     const txn = await walletBarcodePayment.findOne({
//       utr: utr,
//       status: "success",
//     });
//     if (txn) {
//       return res
//         .status(201)
//         .send({ success: false, message: "Transaction already success" });
//     }

//     const updateTxn = await walletBarcodePayment.findOneAndUpdate(
//       { utr: utr },
//       { $set: { status: "success" } },
//       { new: true }
//     );
//     if (!updateTxn) {
//       return res
//         .status(201)
//         .send({ success: false, message: "Failed to update" });
//     }
//     const walletHistory = await walletHistoryModel.findOne({
//       orderId: orderId,
//     });
//     if (!walletHistory) {
//       return res
//         .status(201)
//         .send({ success: false, message: "Wallet History Not Found" });
//     }
//     const updateWalletHistory = await walletHistoryModel.findOneAndUpdate(
//       {
//         orderId: orderId,
//       },
//       { $set: { type: "addmoney" } },
//       { new: true }
//     );
//     if (!updateWalletHistory) {
//       return res
//         .status(201)
//         .send({ success: false, message: "Failed to update wallet history" });
//     }

//     const newBalance = Math.max(
//       0,
//       parseFloat(user?.balance) + parseFloat(walletHistory.amount)
//     );
//     const updateBalance = await userModel.findOneAndUpdate(
//       { email: email },
//       { $set: { balance: newBalance } },
//       { new: true }
//     );
//     if (!updateBalance) {
//       return res
//         .status(201)
//         .send({ success: false, message: "Failed to update user balance" });
//     }

//     return res
//       .status(200)
//       .send({ success: true, message: "Payment Verified and balance added" });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

async function checkPaymentStatus() {
  try {
    const payments = await paymentModel.find({ status: "pending" });

    for (const payment of payments) {
      const paymentResponse = await axios.post(
        "https://pay.onegateway.in/payment/status",
        {
          apiKey: process.env.ONEGATEWAY_API_KEY,
          orderId: payment.orderId,
        }
      );
      const data = paymentResponse.data.data;
      console.log(data);
      // UPDATING STATUS
      if (data.status === "failed") {
        await paymentModel.findOneAndUpdate(
          { orderId: payment.orderId },
          { $set: { status: "failed" } }
        );
        console.log("failed status updated");
      }
      // ADDING MONEY
      if (data.status === "success") {
        await paymentModel.findOneAndUpdate(
          { orderId: payment.orderId },
          { $set: { status: "success", txnId: data.utr } }
        );

        const checkRefund = await walletHistoryModel.findOne({
          orderId: payment.orderId,
          type: "refund",
        });

        if (!checkRefund) {
          const user = await userModel.findOne({
            email: data.customerEmail,
          });
          const newBalance = Math.max(
            0,
            parseFloat(user?.balance) + parseFloat(data.amount)
          );
          if (user) {
            await userModel.findOneAndUpdate(
              { email: data.customerEmail },
              { $set: { balance: newBalance } },
              { new: true }
            );
            // saving history
            const newHistory = new walletHistoryModel({
              orderId: payment.orderId,
              email: data.customerEmail,
              mobile: data.customerNumber,
              balanceBefore: user?.balance,
              balanceAfter: newBalance,
              amount: data.amount,
              product: payment.pname,
              type: "refund",
            });
            await newHistory.save();
            console.log("balance updated");
          }
        }
      }
    }
    console.log("No pending payment found");
  } catch (error) {
    console.error("Error updating orders:", error);
  }
}
cron.schedule("*/5 * * * *", checkPaymentStatus);

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
      // saving payment
      const paymentObject = {
        orderId: orderId,
        name: customerName,
        email: customerEmail,
        mobile: customerNumber,
        amount: amount,
        status: "pending",
        type: "wallet",
        pname: "Wallet Topup",
      };
      const newPayment = new paymentModel(paymentObject);
      await newPayment.save();

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

    console.log(orderId);

    const existingPayment = await paymentModel.findOne({
      orderId: orderId,
      status: "success",
    });

    console.log(existingPayment);

    if (existingPayment) {
      return res.redirect(`${process.env.BASE_URL}/failure`);
    }

    console.log("payment found");

    const paymentResponse = await axios.post(
      "https://pay.onegateway.in/payment/status",
      {
        apiKey: process.env.ONEGATEWAY_API_KEY,
        orderId: orderId,
      }
    );

    console.log(paymentResponse.data);

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
          payerUpi,
        } = data;

        const payment = await paymentModel.findOne({
          orderId: orderId,
        });
        if (!payment) {
          return res.redirect(`${process.env.BASE_URL}/failure`);
        }
        // updating payment status
        payment.status = "success";
        payment.txnId = utr || "none";
        payment.payerUpi = payerUpi || "none";
        await payment.save();

        console.log("payment saved");

        const user = await userModel.findOne({
          email: customerEmail,
        });
        if (!user) {
          return res.redirect(`${process.env.BASE_URL}/failure`);
        }
        // udpating user balance

        const newBalance = Math.max(
          0,
          parseFloat(user?.balance) + parseFloat(data.amount)
        );
        const updatedUser = await userModel.findOneAndUpdate(
          { email: customerEmail },
          {
            $set: {
              balance: newBalance,
            },
          },
          { new: true }
        );
        if (updatedUser) {
          console.log("balance updated");
          // saving wallet history
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

          console.log("history saved");

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
