const express = require("express");
const axios = require("axios");
const paymentModel = require("../models/paymentModel");
const productModel = require("../models/productModel");
const orderModel = require("../models/orderModel");
const userModel = require("../models/userModel");
const walletDiscountModel = require("../models/walletDiscountModel");
const walletHistoryModel = require("../models/walletHistoryModel");
const errModel = require("../models/errModel");
const authMiddleware = require("../middlewares/authMiddleware");
const md5 = require("md5");
const querystring = require("querystring");
const fs = require("fs");
const nodemailer = require("nodemailer");
const router = express.Router();
const cron = require("node-cron");

async function updatePendingOrdersToFailed() {
  try {
    const result = await orderModel.updateMany(
      {
        $or: [
          {
            apiName: "smileOne",
            status: "pending",
            $or: [{ sid: null }, { sid: { $exists: false } }],
          },
          {
            apiName: "moogold",
            status: "processing",
            $or: [{ mid: null }, { mid: { $exists: false } }],
          },
        ],
      },
      { $set: { status: "failed" } },
      { new: true }
    );
    console.log(`Updated ${result.modifiedCount} orders to 'failed' status.`);
  } catch (error) {
    console.error("Error updating orders:", error);
  }
}
cron.schedule("*/5 * * * *", updatePendingOrdersToFailed);
// barcode
router.post("/create", authMiddleware, async (req, res) => {
  try {
    const {
      orderId,
      paymentNote,
      customerName,
      customerEmail,
      customerNumber,
      productName,
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
        redirectUrl: `https://coinsup.in/api/smile/status`,
      }
    );

    if (response.data && response.data.success) {
      // saving order
      const order = new orderModel({
        api: "yes",
        amount: pack.amount,
        orderId: orderId,
        pname: productName,
        price: price,
        customer_email: customerEmail,
        customer_mobile: customerNumber,
        userId: userid,
        zoneId: zoneid,
        prodId: prodId,
        inGameName: inGameName,
        originalPrice: pack.buyingprice,
        discount: discount,
        region: paymentNote,
        paymentMode: "onegateway",
        apiName: "smileOne",
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
      return res
        .status(201)
        .send({ success: false, data: "Error in initiating payment" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error });
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

        // const payment = await paymentModel.findOne({
        //   orderId: orderId,
        //   status: "success",
        // });
        // if (payment) {
        //   return res.redirect(`${process.env.BASE_URL}/failure/duplicatepayment`);
        // }

        const updatePayment = await paymentModel.findOneAndUpdate(
          { orderId: orderId },
          {
            $set: {
              txnId: utr || "none",
              status: "success",
              payerUpi: payerUpi || "none",
            },
          },
          { new: true }
        );

        // searching order
        const order = await orderModel.findOne({ orderId: orderId });
        if (!order) {
          return res.redirect(`${process.env.BASE_URL}/failure/ordernotfound`);
        }

        // searching product
        const prod = await productModel.findOne({ name: order.pname });
        if (!prod) {
          return res.redirect(
            `${process.env.BASE_URL}/failure/productnotfound`
          );
        }

        // searching pack
        const pack = prod.cost.filter(
          (item) => item.prodId === order.prodId
        )[0];
        if (!pack) {
          return res.redirect(`${process.env.BASE_URL}/failure/packnotfound`);
        }

        const productid = pack.id.split("&");

        const uid = process.env.UID;
        const email = process.env.EMAIL;
        const product = "mobilelegends";
        const time = Math.floor(Date.now() / 1000);
        const mKey = process.env.KEY;

        let orderResponse;
        let successLoopCount = 0;

        for (let i = 0; i < productid.length; i++) {
          const signArr = {
            uid,
            email,
            product,
            time,
            userid: order.userId,
            zoneid: order.zoneId,
            productid: productid[i],
          };
          const sortedSignArr = Object.fromEntries(
            Object.entries(signArr).sort()
          );
          const str =
            Object.keys(sortedSignArr)
              .map((key) => `${key}=${sortedSignArr[key]}`)
              .join("&") +
            "&" +
            mKey;
          const sign = md5(md5(str));
          const formData = querystring.stringify({
            email,
            uid,
            userid: order.userId,
            zoneid: order.zoneId,
            product,
            productid: productid[i],
            time,
            sign,
          });
          const apiUrl =
            order.region === "brazil"
              ? "https://www.smile.one/br/smilecoin/api/createorder"
              : "https://www.smile.one/ph/smilecoin/api/createorder";

          try {
            orderResponse = await axios.post(apiUrl, formData, {
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
            });
            if (orderResponse.data.status === 200) {
              successLoopCount += 1; // Increment the counter by 1 for each iteration
            }
          } catch (error) {
            console.error(
              `Error creating order for productId: ${productid[i]}`,
              error.message
            );
          }
        }

        if (orderResponse?.data?.status === 200) {
          // updating order status
          const updateOrder = await orderModel.findOneAndUpdate(
            { orderId: orderId },
            {
              $set: {
                status: "success",
                sid: orderResponse.data.order_id,
                loopCount: `${successLoopCount} out of ${productid.length}`,
              },
            },
            { new: true }
          );

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
          return res.redirect(`${process.env.BASE_URL}/success`);
        } else {
          // updating order status
          const updateOrder = await orderModel.findOneAndUpdate(
            { orderId: orderId },
            { $set: { status: "refunded" } },
            { new: true }
          );

          const checkRefund = await walletHistoryModel.findOne({
            orderId: orderId,
            type: "refund",
          });

          if (!checkRefund) {
            const user = await userModel.findOne({ email: customerEmail });
            const newBalance = Math.max(
              0,
              parseFloat(user?.balance) + parseFloat(amount)
            );
            if (user) {
              await userModel.findOneAndUpdate(
                { email: customerEmail },
                { $set: { balance: newBalance } },
                { new: true }
              );
            }
            // saving wallet history
            const newHistory = new walletHistoryModel({
              orderId: orderId,
              email: customerEmail,
              mobile: customerName,
              balanceBefore: user?.balance,
              balanceAfter: newBalance,
              product: pack.amount,
              amount: amount,
              type: "refund",
            });
            await newHistory.save();
          }
          // saving error
          const err = new errModel({
            orderId: orderId,
            error: orderResponse.data.message,
            message: orderResponse.data.message,
          });
          await err.save();

          return res.redirect(`${process.env.BASE_URL}/failure`);
        }
      } else {
        console.error("OrderID Not Found");
        return res.redirect(`${process.env.BASE_URL}/failure`);
      }
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
});

// wallet
router.post("/wallet", authMiddleware, async (req, res) => {
  try {
    const {
      orderId,
      userid,
      zoneid,
      region,
      prodId,
      customerEmail,
      customerMobile,
      productName,
      discount,
      inGameName,
    } = req.body;

    if (
      !orderId ||
      !userid ||
      !region ||
      !prodId ||
      !customerEmail ||
      !customerMobile ||
      !productName
    ) {
      return res.status(404).json({ message: "Invalid details" });
    }

    // searching product
    const prod = await productModel.findOne({ name: productName });
    if (!prod) {
      return res.status(201).send({
        success: false,
        message: "Product not found",
      });
    }

    // searching pack
    const user = await userModel.findOne({ email: customerEmail });
    const pack = prod?.cost?.filter((item) => item.prodId === prodId)[0];
    const price = user?.reseller === "yes" ? pack?.resPrice : pack?.price;

    const productId = pack.id.split("&");
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
      return res.status(201).send({
        success: false,
        message: "User not found",
      });
    }
    if (parseFloat(user?.balance) < parseFloat(price)) {
      return res
        .status(201)
        .send({ success: false, message: "Balance is less for this order" });
    }
    const productPrice = price - (price * wd) / 100;
    const newBalance = Math.max(
      0,
      parseFloat(user?.balance) - parseFloat(productPrice)
    );

    // update user balance
    const updateBalance = await userModel.findOneAndUpdate(
      {
        email: customerEmail,
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
        .status(201)
        .send({ success: false, message: "Err updating balance" });
    }
    // saving wallet history
    const newHistory = new walletHistoryModel({
      orderId: orderId,
      email: customerEmail,
      mobile: customerMobile,
      balanceBefore: user?.balance,
      balanceAfter: newBalance,
      amount: productPrice,
      product: pack.amount,
      type: "order",
    });
    await newHistory.save();

    const uid = process.env.UID;
    const email = process.env.EMAIL;
    const product = "mobilelegends";
    const time = Math.floor(Date.now() / 1000);
    const mKey = process.env.KEY;

    let orderResponse;
    let successLoopCount = 0;

    for (let index = 0; index < productId.length; index++) {
      const signArr = {
        uid,
        email,
        product,
        time,
        userid,
        zoneid,
        productid: productId[index],
      };
      const sortedSignArr = Object.fromEntries(Object.entries(signArr).sort());
      const str =
        Object.keys(sortedSignArr)
          .map((key) => `${key}=${sortedSignArr[key]}`)
          .join("&") +
        "&" +
        mKey;
      const sign = md5(md5(str));
      //! CREATE ORDER
      const formData = querystring.stringify({
        email,
        uid,
        userid,
        zoneid,
        product,
        productid: productId[index],
        time,
        sign,
      });
      let apiUrl =
        region === "brazil"
          ? "https://www.smile.one/br/smilecoin/api/createorder"
          : "https://www.smile.one/ph/smilecoin/api/createorder";

      try {
        orderResponse = await axios.post(apiUrl, formData, {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });
        if (orderResponse.data.status === 200) {
          successLoopCount += 1; // Increment the counter by 1 for each iteration
        }
      } catch (error) {
        console.error(
          `Error creating order for productId: ${productId[i]}`,
          error.message
        );
      }
    }

    if (orderResponse.data.status === 200) {
      const order = new orderModel({
        api: "yes",
        orderId: orderId,
        pname: productName,
        price: price,
        discountedPrice: productPrice,
        amount: pack.amount,
        customer_email: customerEmail,
        customer_mobile: customerMobile,
        inGameName: inGameName,
        userId: userid,
        zoneId: zoneid,
        originalPrice: pack.buyingprice,
        paymentMode: "wallet",
        apiName: "smileOne",
        status: "success",
        sid: orderResponse.data.order_id,
        loopCount: `${successLoopCount} out of ${productId.length}`,
      });
      await order.save();

      // send mail
      try {
        const dynamicData = {
          orderId: `${orderId}`,
          amount: `${pack.amount}`,
          price: `${price}`,
          p_info: `${productName}`,
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
          to: `${customerEmail}`,
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
      const order = new orderModel({
        api: "yes",
        orderId: orderId,
        pname: productName,
        price: price,
        discountedPrice: productPrice,
        amount: pack.amount,
        customer_email: customerEmail,
        customer_mobile: customerMobile,
        inGameName: inGameName,
        userId: userid,
        zoneId: zoneid,
        originalPrice: pack.buyingprice,
        paymentMode: "wallet",
        apiName: "smileOne",
        status: "failed",
      });
      await order.save();

      // saving error
      const err = new errModel({
        orderId: orderId,
        error: orderResponse.data.message,
        message: orderResponse.data.message,
      });
      await err.save();

      return res.status(400).send({ success: false, message: "Order Failed" });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
