const express = require("express");
const axios = require("axios");
const productModel = require("../models/productModel");
const orderModel = require("../models/orderModel");
const userModel = require("../models/userModel");
const paymentModel = require("../models/paymentModeModel");
const walletHistoryModel = require("../models/walletHistoryModel");
const walletDiscountModel = require("../models/walletDiscountModel");
const errModel = require("../models/errModel");
const authMiddleware = require("../middlewares/authMiddleware");
const sendMail = require("../controllers/sendMail");
const fs = require("fs");
const nodemailer = require("nodemailer");

// Create an Express Router
const router = express.Router();
process.env.TZ = "Asia/Kolkata"; // Replace with 'Asia/Kolkata' for IST

// barcode
router.post("/create", authMiddleware, async (req, res) => {
  try {
    const {
      orderId,
      customerName,
      customerEmail,
      customerNumber,
      productName,
      paymentNote,
      prodId,
      userid,
      zoneid,
      discount,
      inGameName,
    } = req.body;

    if (
      !orderId ||
      !customerName ||
      !customerEmail ||
      !customerNumber ||
      !userid ||
      !prodId ||
      !productName
    ) {
      return res
        .status(201)
        .send({ success: false, message: "Missing required fields" });
    }

    const product = await productModel.findOne({ name: productName });
    if (!product) {
      return res
        .status(201)
        .send({ success: false, message: "Product not found" });
    }

    const user = await userModel.findOne({ email: customerEmail });
    const pack = product.cost.filter((item) => item.prodId === prodId)[0];
    const price = user?.reseller === "yes" ? pack?.resPrice : pack?.price;

    // Proceeding with the payment initiation
    const response = await axios.post(
      "https://backend.onegateway.in/payment/initiate",
      {
        apiKey: process.env.ONEGATEWAY_API_KEY,
        scannerIncluded: true,
        orderId,
        amount: price,
        paymentNote,
        customerName,
        customerEmail,
        customerNumber,
        redirectUrl: `https://coinsup.in/api/manual/status`,
      }
    );

    if (response.data && response.data.success) {
      // saving order
      const order = new orderModel({
        api: "no",
        amount: pack.amount,
        orderId: orderId,
        pname: productName,
        price: price,
        customer_email: customerEmail,
        customer_mobile: customerNumber,
        userId: userid,
        zoneId: zoneid,
        inGameName: inGameName,
        prodId: prodId,
        originalPrice: pack.buyingprice,
        discount: discount,
        paymentMode: "onegateway",
        apiName: "manaul",
        status: "pending",
      });
      await order.save();

      // saving payment
      const paymentObject = {
        name: customerName,
        email: customerEmail,
        mobile: customerNumber,
        amount: price,
        orderId: orderId,
        status: "pending",
        type: "order",
        pname: productName,
      };
      const newPayment = new paymentModel(paymentObject);
      await newPayment.save();

      return res.status(200).send({ success: true, data: response.data.data });
    } else {
      console.log(response.data);
      return res
        .status(201)
        .send({ success: false, data: "Error in initiating payment" });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: error.message });
  }
});
router.get("/status", async (req, res) => {
  try {
    const { orderId } = req.query;

    const existingOrder = await orderModel.findOne({
      orderId: orderId,
      status: "success",
    });
    if (existingOrder) {
      return res.redirect(`${process.env.BASE_URL}/failure`);
    }

    const paymentResponse = await axios.post(
      "https://pay.onegateway.in/payment/status",
      {
        apiKey: process.env.ONEGATEWAY_API_KEY,
        orderId: orderId,
      }
    );

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

        const payment = await paymentModel.findOne({ orderId: orderId });
        if (!payment) {
          return res.redirect(`${process.env.BASE_URL}/failure`);
        }
        // updating payment status
        payment.status = "success";
        payment.txnId = utr;
        payment.payerUpi = payerUpi || "none";
        await payment.save();

        // searching order
        const order = await orderModel.findOne({ orderId: orderId });
        if (!order) {
          return res.redirect(`${process.env.BASE_URL}/failure`);
        }

        // searching product
        const prod = await productModel.findOne({ name: order.pname });
        if (!prod) {
          return res.redirect(`${process.env.BASE_URL}/failure`);
        }

        // searching pack
        const pack = prod.cost.filter(
          (item) => item.prodId === order.prodId
        )[0];

        const updateOrder = await orderModel.findOneAndUpdate(
          { orderId: orderId },
          { $set: { status: "processing" } },
          { new: true }
        );

        // SEND MAIL TO USER
        try {
          const dynamicData = {
            orderId: `${orderId}`,
            amount: `${order.amount}`,
            price: `${order.price}`,
            p_info: `${order.pname}`,
            userId: `${order.userId}`,
            zoneId: `${order.zoneId}`,
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
              user: process.env.MAIL,
              pass: process.env.APP_PASSWORD,
            },
          });
          let mailDetails = {
            from: process.env.MAIL,
            to: `${order.customer_email}`,
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

        //! SENDING MAIL TO ADMIN
        const sub = "New Order Recieved";
        const msgg =
          "Hello Admin! You have received a new order. Kindly login to see your order.";
        await sendMail("coinssups@gmail.com", sub, "", msgg);

        return res.redirect(`${process.env.BASE_URL}/success`);
      } else {
        const { orderId } = data;
        const updateOrder = await orderModel.findOneAndUpdate(
          { orderId: orderId },
          { $set: { status: "failed" } },
          { new: true }
        );

        // saving error
        const err = new errModel({
          orderId: orderId,
          error: paymentResponse.data,
          message: paymentResponse.data,
        });
        await err.save();

        return res.redirect(`${process.env.BASE_URL}/failure`);
      }
    }
  } catch (error) {
    console.error("Internal Server Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// wallet
router.post("/wallet", authMiddleware, async (req, res) => {
  try {
    const {
      api,
      orderId,
      userid,
      zoneid,
      customer_email,
      customer_mobile,
      pname,
      prodId,
      discount,
      inGameName,
    } = req.body;

    if (
      !api ||
      !orderId ||
      !userid ||
      !customer_email ||
      !customer_mobile ||
      !prodId ||
      !pname
    ) {
      return res
        .status(400)
        .send({ success: false, message: "Invalid details" });
    }

    const existingOrder = await orderModel.findOne({
      orderId: orderId,
      status: "success",
    });
    if (existingOrder) {
      return res.redirect(`${process.env.BASE_URL}/failure`);
    }

    // searching product
    const prod = await productModel.findOne({ name: pname });
    if (!prod) {
      return res.redirect(`${process.env.BASE_URL}/failure`);
    }

    // searching pack
    const user = await userModel.findOne({ email: customer_email });
    const pack = prod.cost.filter((item) => item.prodId === prodId)[0];
    const price = user?.reseller === "yes" ? pack?.resPrice : pack?.price;

    if (!pack) {
      return res.status(201).send({
        success: false,
        message: "Error in finding pack",
      });
    }

    // fetching discount
    const walletDiscount = await walletDiscountModel.findOne({});
    const wd = (walletDiscount?.status && walletDiscount.discount) || 0;

    if (!user) {
      return res.status(400).send({
        success: false,
        message: "User not found",
      });
    }
    if (parseFloat(user?.balance) < parseFloat(price)) {
      return res
        .status(400)
        .send({ success: false, message: "Balance is less for this order" });
    }

    const productPrice = price - (price * wd) / 100;
    const newBalance = Math.max(
      0,
      parseFloat(user?.balance) - parseFloat(productPrice)
    );
    const updateBalance = await userModel.findOneAndUpdate(
      {
        email: customer_email,
      },
      {
        $set: {
          balance: newBalance,
        },
      },
      { new: true }
    );
    if (!updateBalance) {
      return res
        .status(400)
        .send({ success: false, message: "Err updating balance" });
    }

    // saving wallet history
    const newHistory = new walletHistoryModel({
      orderId: orderId,
      email: customer_email,
      mobile: customer_mobile,
      balanceBefore: user?.balance,
      balanceAfter: newBalance,
      amount: productPrice,
      product: pack.amount,
      type: "order",
    });
    await newHistory.save();

    const newOrder = new orderModel({
      api: api,
      amount: pack.amount,
      price: price,
      discountedPrice: productPrice,
      customer_email: customer_email,
      customer_mobile: customer_mobile,
      pname: pname,
      userId: userid,
      zoneId: zoneid,
      inGameName: inGameName,
      orderId: orderId,
      originalPrice: pack.buyingprice,
      status: "processing",
      paymentMode: "wallet",
      apiName: "manual",
    });
    await newOrder.save();

    // SEND MAIL TO USER
    try {
      const dynamicData = {
        orderId: `${orderId}`,
        amount: `${pack.amount}`,
        price: `${price}`,
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
          user: process.env.MAIL,
          pass: process.env.APP_PASSWORD,
        },
      });
      let mailDetails = {
        from: process.env.MAIL,
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

    // SENDING MAIL TO ADMIN
    const sub = "New Order Recieved";
    const msgg =
      "Hello Admin! You have received a new order. Kindly login to see your order.";
    await sendMail("coinssups@gmail.com", sub, "", msgg);

    return res
      .status(200)
      .send({ success: true, message: "Order Placed Successfully" });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
});

module.exports = router;
