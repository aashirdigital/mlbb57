const express = require("express");
const axios = require("axios");
const paymentModel = require("../models/paymentModel");
const productModel = require("../models/productModel");
const walletHistoryModel = require("../models/walletHistoryModel");
const orderModel = require("../models/orderModel");
const userModel = require("../models/userModel");
const fs = require("fs");
const nodemailer = require("nodemailer");
const browserMiddleware = require("../middlewares/browserMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");

// Create an Express Router
const router = express.Router();

//? ================================== !! GET YOKCASH PRODUCT !! ===========================
router.post("/get-yokcash", browserMiddleware, async (req, res) => {
  try {
    const url = "https://a-api.yokcash.com/api/service";
    const params = new URLSearchParams();
    params.append("api_key", process.env.YOKCASH_API);
    const response = await fetch(url, {
      method: "POST",
      body: params,
    });
    const data = await response.json();
    const mobileLegendsServices = data.data.filter(
      (service) => service.kategori === req.body.gameName
    );
    return res.status(200).send({
      success: true,
      message: "Yokcash Services Fetched",
      data: mobileLegendsServices,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ status: false, msg: "Internal server error" });
  }
});

//? ================================== !! YOKCASH UPI ORDER !! ===========================
router.post("/check-yokcash-upi-order", browserMiddleware, async (req, res) => {
  try {
    const { orderId } = req.query;

    const existingOrder = await orderModel.findOne({ orderId: orderId });
    if (existingOrder) {
      return res.redirect("https://archofficial.com/user-dashboard");
    }

    const orderStatusResponse = await axios.post(
      "https://pgateway.in/order/status",
      {
        token: process.env.API_TOKEN,
        order_id: orderId,
      }
    );
    // Check if the order ID is found
    if (orderStatusResponse.data.status) {
      const transactionDetails = orderStatusResponse.data.results;
      if (transactionDetails.status === "Success") {
        const {
          order_id,
          txn_note,
          customer_email,
          customer_mobile,
          txn_amount,
          product_name,
          utr_number,
          customer_name,
        } = transactionDetails;

        if (
          !customer_email ||
          !customer_mobile ||
          !order_id ||
          !txn_note ||
          !product_name ||
          !utr_number ||
          !customer_name
        ) {
          return res.redirect("https://archofficial.com/user-dashboard");
        }

        const [userid, zoneid, productids, pname, amount] = txn_note.split("@");
        const productid = productids.split("&");

        const pp = await productModel.findOne({ name: pname });
        if (!pp) {
          return res.status(404).json({ message: "Product not found" });
        }

        const priceExists = pp.cost.some(
          (item) =>
            item.amount === amount &&
            (parseFloat(item.price) === parseFloat(txn_amount) ||
              parseFloat(item.resPrice) === parseFloat(txn_amount))
        );
        if (!priceExists) {
          return res.status(400).json({
            message: "Amount does not match",
          });
        }

        const API_KEY = process.env.YOKCASH_API;
        const url = "https://a-api.yokcash.com/api/order";
        const params = new URLSearchParams();

        let response;
        for (let i = 0; i < productid.length; i++) {
          params.append("api_key", API_KEY);
          params.append("service_id", productid[i]);
          params.append("target", userid + "|" + zoneid);
          params.append("kontak", customer_mobile);
          params.append("idtrx", order_id);

          response = await fetch(url, {
            method: "POST",
            body: params,
          });
        }

        if (!response.status) {
          return res
            .status(202)
            .send({ success: false, message: "Failed to Order" });
        }

        const paymentObject = {
          name: customer_name,
          email: customer_email,
          mobile: customer_mobile,
          amount: txn_amount,
          orderId: order_id,
          status: transactionDetails.status,
          upi_txn_id: utr_number,
        };
        const existingPayment = await paymentModel.findOne({
          upi_txn_id: utr_number,
        });
        if (!existingPayment) {
          const newPayment = new paymentModel(paymentObject);
          await newPayment.save();
        }

        if (response.status) {
          const order = new orderModel({
            api: "yes",
            amount: amount,
            orderId: order_id,
            p_info: pname,
            price: txn_amount,
            customer_email,
            customer_mobile,
            playerId: userid,
            userId: userid,
            zoneId: zoneid,
            status: "success",
          });
          await order.save();

          //!send mail
          try {
            const dynamicData = {
              orderId: `${order_id}`,
              amount: `${amount}`,
              price: `${txn_amount}`,
              p_info: `${product_name}`,
              userId: `${userid}`,
              zoneId: `${zoneid}`,
            };
            let htmlContent = fs.readFileSync("order.html", "utf8");
            Object.keys(dynamicData).forEach((key) => {
              const placeholder = new RegExp(`{${key}}`, "g");
              htmlContent = htmlContent.replace(placeholder, dynamicData[key]);
            });
            // Send mail
            let mailTransporter = nodemailer.createTransport({
              service: "gmail",
              auth: {
                user: process.env.SENDING_EMAIL,
                pass: process.env.MAIL_PASS,
              },
            });
            let mailDetails = {
              from: process.env.SENDING_EMAIL,
              to: `${customer_email}`,
              subject: "Order Successful!",
              html: htmlContent,
            };
            mailTransporter.sendMail(mailDetails, function (err, data) {
              if (err) {
                console.log(err);
              }
            });
          } catch (error) {
            console.error("Error sending email:", error);
          }

          return res.redirect("https://archofficial.com/user-dashboard");
        } else {
          console.error("Error placing order:", response.status.msg);
          return res.status(500).json({ error: "Error placing order" });
        }
      } else {
        console.error("OrderID Not Found");
        return res.status(404).json({ error: "OrderID Not Found" });
      }
    }
  } catch (error) {
    console.error("Internal Server Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
router.post("/place-yokcash-from-wallet", authMiddleware, async (req, res) => {
  try {
    const {
      order_id,
      txn_amount,
      product_name,
      customer_email,
      customer_mobile,
      txn_note,
    } = req.body;

    if (
      !order_id ||
      !txn_amount ||
      !product_name ||
      !customer_email ||
      !customer_mobile ||
      !txn_note
    ) {
      return res
        .status(400)
        .send({ success: false, message: "Invalid Details" });
    }

    const existingOrder = await orderModel.findOne({ orderId: order_id });
    if (existingOrder) {
      return res.redirect("https://archofficial.com/user-dashboard");
    }

    //================================= UPDATING BALANCE
    const user = await userModel.findOne({ email: customer_email });

    if (!user || user?.balance < txn_amount) {
      return res.redirect("https://archofficial.com/user-dashboard");
    }

    const newBalance = Math.max(0, user.balance - txn_amount);

    await userModel.findOneAndUpdate(
      { email: customer_email },
      { $set: { balance: newBalance } },
      { new: true }
    );

    const history = new walletHistoryModel({
      orderId: order_id,
      email: customer_email,
      balanceBefore: user.balance,
      balanceAfter: newBalance,
      price: txn_amount,
      p_info: product_name,
    });
    await history.save();

    //================================= UPDATING BALANCE

    const [userid, zoneid, productids, pname, amount] = txn_note.split("@");
    const productid = productids.split("&");

    const pp = await productModel.findOne({ name: pname });
    if (!pp) {
      return res.status(404).json({ message: "Product not found" });
    }
    const priceExists = pp.cost.some(
      (item) =>
        item.amount === amount &&
        (parseFloat(item.price) === parseFloat(txn_amount) ||
          parseFloat(item.resPrice) === parseFloat(txn_amount))
    );
    if (!priceExists) {
      return res.status(400).json({
        message: "Amount does not match",
      });
    }

    const API_KEY = process.env.YOKCASH_API;
    const url = "https://a-api.yokcash.com/api/order";
    const params = new URLSearchParams();

    let response;
    for (let i = 0; i < productid.length; i++) {
      params.append("api_key", API_KEY);
      params.append("service_id", productid[i]);
      params.append("target", userid + "|" + zoneid);
      params.append("kontak", customer_mobile);
      params.append("idtrx", order_id);

      response = await fetch(url, {
        method: "POST",
        body: params,
      });
    }

    if (!response.status) {
      return res
        .status(202)
        .send({ success: false, message: "Failed to Order" });
    }

    if (response.status) {
      const order = new orderModel({
        api: "yes",
        amount: amount,
        orderId: order_id,
        p_info: pname,
        price: txn_amount,
        customer_email: customer_email,
        customer_mobile: customer_mobile,
        playerId: userid,
        userId: userid,
        zoneId: zoneid,
        status: "success",
      });
      await order.save();

      //!send mail
      try {
        const dynamicData = {
          orderId: `${order_id}`,
          amount: `${amount}`,
          price: `${txn_amount}`,
          p_info: `${pname}`,
          userId: `${userid}`,
          zoneId: `${zoneid}`,
        };
        let htmlContent = fs.readFileSync("order.html", "utf8");
        Object.keys(dynamicData).forEach((key) => {
          const placeholder = new RegExp(`{${key}}`, "g");
          htmlContent = htmlContent.replace(placeholder, dynamicData[key]);
        });
        // Send mail
        let mailTransporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.SENDING_EMAIL,
            pass: process.env.MAIL_PASS,
          },
        });
        let mailDetails = {
          from: process.env.SENDING_EMAIL,
          to: `${customer_email}`,
          subject: "Order Successful!",
          html: htmlContent,
        };
        mailTransporter.sendMail(mailDetails, function (err, data) {
          if (err) {
            console.log(err);
          }
        });
      } catch (error) {
        console.error("Error sending email:", error);
      }
      return res
        .status(200)
        .send({ success: true, message: "Order Placed Successfully" });
    } else {
      console.error("Error placing order:", response.status.msg);
      return res.status(500).json({ error: "Error placing order" });
    }
  } catch (error) {
    console.error("Internal Server Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
