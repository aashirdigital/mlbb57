const express = require("express");
const axios = require("axios");
const base64 = require("base-64");
const paymentModel = require("../models/paymentModel");
const productModel = require("../models/productModel");
const orderModel = require("../models/orderModel");
const userModel = require("../models/userModel");
const walletHistoryModel = require("../models/walletHistoryModel");
const walletDiscountModel = require("../models/walletDiscountModel");
const errModel = require("../models/errModel");
const fs = require("fs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();
const cron = require("node-cron");

const generateBasicAuthHeader = () => {
  const credentials = `${process.env.MOOGOLD_PARTNER_ID}:${process.env.MOOGOLD_SECRET}`;
  return `Basic ${base64.encode(credentials)}`;
};
const generateAuthSignature = (payload, timestamp, path) => {
  const stringToSign = `${JSON.stringify(payload)}${timestamp}${path}`;
  return crypto
    .createHmac("sha256", process.env.MOOGOLD_SECRET)
    .update(stringToSign)
    .digest("hex");
};

// REFUND FUNCTION
// REFUND FUNCTION
// REFUND FUNCTION
const checkAndProcessRefunds = async () => {
  try {
    const orders = await orderModel.find({
      status: "processing",
      apiName: "moogold",
    });

    console.log(orders);

    for (const order of orders) {
      const payload = {
        path: "order/order_detail",
        order_id: order.mid,
      };

      // Generate authorization
      const timestamp = Math.floor(Date.now() / 1000);
      const path = "order/order_detail";
      const authSignature = crypto
        .createHmac("sha256", process.env.MOOGOLD_SECRET)
        .update(`${JSON.stringify(payload)}${timestamp}${path}`)
        .digest("hex");

      try {
        const response = await axios.post(
          "https://moogold.com/wp-json/v1/api/order/order_detail",
          payload,
          {
            headers: {
              Authorization: generateBasicAuthHeader(),
              auth: authSignature,
              timestamp: timestamp,
            },
          }
        );

        console.log(response.data);

        // Check the order status
        const { order_status } = response.data;
        if (order_status === "refunded") {
          const user = await userModel.findOne({
            mobile: order.customer_mobile,
          });
          if (user) {
            const newBalance =
              parseFloat(user.balance) + parseFloat(order.discountedPrice);
            await userModel.findOneAndUpdate(
              { mobile: order.customer_mobile },
              { $set: { balance: newBalance } },
              { new: true }
            );

            // Update order status to refunded
            await orderModel.findOneAndUpdate(
              { _id: order._id },
              { $set: { status: "refunded" } }
            );

            // Save wallet history
            const history = new walletHistoryModel({
              orderId: order.orderId,
              email: order.customer_email,
              mobile: order.customer_mobile,
              balanceBefore: user.balance,
              balanceAfter: newBalance,
              amount: order.discountedPrice,
              product: order.pname,
              type: "refund",
            });
            await history.save();
          }
        } else if (order_status === "completed") {
          // Update order status to refunded
          await orderModel.findOneAndUpdate(
            { _id: order._id },
            { $set: { status: "success" } }
          );
        }
      } catch (err) {
        console.error(
          `Error fetching order details for ${order.orderId}:`,
          err.message
        );
      }
    }
    console.log("Refund job completed.");
  } catch (err) {
    console.error("Error in refund job:", err.message);
  }
};

// Schedule the job to run every 5 minutes
checkAndProcessRefunds();
// cron.schedule("*/5 * * * *", () => {});
// REFUND FUNCTION
// REFUND FUNCTION
// REFUND FUNCTION

// CALLBACK
// CALLBACK
// CALLBACK
// router.post("/moogold/callback", async (req, res) => {
//   try {
//     const { status, message, account_details, order_id, total } = req.body;

//     // Validate callback payload
//     if (!order_id || !status) {
//       return res
//         .status(400)
//         .send({ success: false, message: "Invalid callback payload" });
//     }

//     // Find the order using the `order_id`
//     const order = await orderModel.findOne({ mid: order_id });
//     if (!order) {
//       return res
//         .status(404)
//         .send({ success: false, message: "Order not found" });
//     }

//     // Update the order status based on the callback
//     order.status = status;
//     order.callbackMessage = message;
//     order.callbackAmount = total;
//     await order.save();

//     // Log the callback for debugging
//     console.log("Callback received:", req.body);

//     // Respond to the callback
//     res
//       .status(200)
//       .send({ success: true, message: "Callback processed successfully" });
//   } catch (error) {
//     console.error("Error processing callback:", error);
//     res.status(500).send({ success: false, message: "Server error" });
//   }
// });
// CALLBACK
// CALLBACK
// CALLBACK

router.post("/list-product", async (req, res) => {
  const categoryId = req.body.categoryId;
  if (!categoryId) {
    return res.status(400).send({ error: "Category ID is required" });
  }
  const payload = {
    path: "product/list_product",
    category_id: categoryId,
  };
  const timestamp = Math.floor(Date.now() / 1000);
  const path = "product/list_product";
  const stringToSign = `${JSON.stringify(payload)}${timestamp}${path}`;
  const authSignature = require("crypto")
    .createHmac("sha256", process.env.MOOGOLD_SECRET)
    .update(stringToSign)
    .digest("hex");

  try {
    const response = await axios.post(
      "https://moogold.com/wp-json/v1/api/product/list_product",
      payload,
      {
        headers: {
          Authorization: generateBasicAuthHeader(),
          auth: authSignature,
          timestamp: timestamp,
        },
      }
    );
    return res
      .status(200)
      .send({ success: true, message: "Product Fetched", data: response.data });
  } catch (error) {
    return res.status(500).send({ error: error.message });
  }
});
router.post("/moogold-product", async (req, res) => {
  const productID = req.body.product_id;

  if (!productID) {
    return res.status(400).send({ error: "Product ID is required" });
  }

  const payload = {
    path: "product/product_detail",
    product_id: productID,
  };

  const timestamp = Math.floor(Date.now() / 1000); // Current UNIX timestamp
  const path = "product/product_detail";
  const stringToSign = `${JSON.stringify(payload)}${timestamp}${path}`;
  const authSignature = require("crypto")
    .createHmac("sha256", process.env.MOOGOLD_SECRET)
    .update(stringToSign)
    .digest("hex");

  try {
    const response = await axios.post(
      "https://moogold.com/wp-json/v1/api/product/product_detail",
      payload,
      {
        headers: {
          Authorization: generateBasicAuthHeader(),
          auth: authSignature,
          timestamp: timestamp,
        },
      }
    );
    return res
      .status(200)
      .send({ success: true, message: "Product Fetched", data: response.data });
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).send(error.response.data);
    } else {
      res
        .status(500)
        .send({ error: "An error occurred while fetching the product list" });
    }
  }
});
router.post("/moogold-servers", async (req, res) => {
  const productID = req.body.product_id;

  if (!productID) {
    return res.status(400).send({ error: "Product ID is required" });
  }

  const payload = {
    path: "product/server_list",
    product_id: productID,
  };

  const timestamp = Math.floor(Date.now() / 1000); // Current UNIX timestamp
  const path = "product/server_list";
  const stringToSign = `${JSON.stringify(payload)}${timestamp}${path}`;
  const authSignature = require("crypto")
    .createHmac("sha256", process.env.MOOGOLD_SECRET)
    .update(stringToSign)
    .digest("hex");

  try {
    const response = await axios.post(
      "https://moogold.com/wp-json/v1/api/product/server_list",
      payload,
      {
        headers: {
          Authorization: generateBasicAuthHeader(),
          auth: authSignature,
          timestamp: timestamp,
        },
      }
    );
    return res
      .status(200)
      .send({ success: true, message: "Product Fetched", data: response.data });
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).send(error.response.data);
    } else {
      res
        .status(500)
        .send({ error: "An error occurred while fetching the product list" });
    }
  }
});

// Barcode
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
    } = req.body;

    if (
      !orderId ||
      !customerName ||
      !customerEmail ||
      !customerNumber ||
      !userid ||
      !zoneid ||
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
    const pack = product.cost.filter((item) => item.prodId === prodId)[0];

    // saving order
    const order = new orderModel({
      api: "yes",
      amount: pack.amount,
      orderId: orderId,
      pname: productName,
      price: pack.price,
      customer_email: customerEmail,
      customer_mobile: customerNumber,
      userId: userid,
      zoneId: zoneid,
      prodId: prodId,
      discount: discount,
      originalPrice: pack.buyingprice,
      paymentMode: "onegateway",
      apiName: "moogold",
      status: "processing",
    });
    await order.save();

    // Proceeding with the payment initiation
    const response = await axios.post(
      "https://backend.onegateway.in/payment/initiate",
      {
        apiKey: process.env.ONEGATEWAY_API_KEY,
        scannerIncluded: true,
        orderId,
        amount: pack.price,
        paymentNote,
        customerName,
        customerEmail,
        customerNumber,
        redirectUrl: `https://coinsup.in/api/moogold/status`,
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
          orderId: orderId,
          name: customerName,
          email: customerEmail,
          mobile: customerNumber,
          amount: amount,
          status: data.status,
          txnId: utr,
          type: "order",
        };
        const newPayment = new paymentModel(paymentObject);
        await newPayment.save();

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
        const productid = pack.id;

        // GETTING PAYLOAD STARTS
        const fieldsPayload = {
          path: "product/product_detail",
          product_id: paymentNote,
        };

        const timestampp = Math.floor(Date.now() / 1000);
        const pathh = "product/product_detail";
        const authSignaturee = generateAuthSignature(
          fieldsPayload,
          timestampp,
          pathh
        );

        const moogold = await axios.post(
          "https://moogold.com/wp-json/v1/api/product/product_detail",
          fieldsPayload,
          {
            headers: {
              Authorization: generateBasicAuthHeader(),
              auth: authSignaturee,
              timestamp: timestampp,
            },
          }
        );

        if (moogold.data.err_code) {
          // updating order status
          const updateOrder = await orderModel.findOneAndUpdate(
            { orderId: orderId },
            { $set: { status: "failed" } },
            { new: true }
          );

          const err = new errModel({
            orderId: orderId,
            error: moogold.data.err_code,
            message: moogold.data.err_message,
          });
          await err.save();

          return res.redirect(`${process.env.BASE_URL}/failure`);
        }
        //? GETTING FIELDS END

        //! CREATE ORDER MOOGOLD
        const payload = {
          path: "order/create_order",
          data: {
            category: 1,
            "product-id": productid,
            quantity: 1,
          },
        };

        moogold.data.fields.forEach((field, index) => {
          if (index === 0) {
            payload.data[field] = order.userId;
          } else if (index === 1) {
            payload.data[field] = order.zoneId;
          }
        });
        // GETTING PAYLOAD END

        console.log(payload);

        const timestamp = Math.floor(Date.now() / 1000);
        const path = "order/create_order";
        const authSignature = generateAuthSignature(payload, timestamp, path);

        const response = await axios.post(
          "https://moogold.com/wp-json/v1/api/order/create_order",
          payload,
          {
            headers: {
              Authorization: generateBasicAuthHeader(),
              auth: authSignature,
              timestamp: timestamp,
            },
          }
        );

        console.log(response.data);

        if (response.data.err_code) {
          // updating order status
          const updateOrder = await orderModel.findOneAndUpdate(
            { orderId: orderId },
            { $set: { status: "failed" } },
            { new: true }
          );

          const err = new errModel({
            orderId: orderId,
            error: response.data.err_code,
            message: response.data.err_message,
          });
          await err.save();

          return res.redirect(`${process.env.BASE_URL}/failure`);
        }

        // updating order status
        const updateOrder = await orderModel.findOneAndUpdate(
          { orderId: orderId },
          { $set: { status: "success", mid: response.data.order_id } },
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
        console.error("OrderID Not Found");
        return res.redirect(`${process.env.BASE_URL}/failure`);
      }
    }
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ error: error.message });
  }
});

// wallet
router.post("/wallet", authMiddleware, async (req, res) => {
  try {
    const {
      orderId,
      userid,
      zoneid,
      prodId,
      customerEmail,
      customerNumber,
      productName,
      gameName,
      discount,
    } = req.body;

    if (
      !orderId ||
      !userid ||
      !zoneid ||
      !prodId ||
      !customerEmail ||
      !customerNumber ||
      !gameName ||
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
    const pack = prod.cost.filter((item) => item.prodId === prodId)[0];
    const productid = pack.id;
    if (!pack) {
      return res.status(201).send({
        success: false,
        message: "Error in finding pack",
      });
    }

    // fetching discount
    const walletDiscount = await walletDiscountModel.findOne({});
    const wd = (walletDiscount?.status && walletDiscount.discount) || 0;

    const user = await userModel.findOne({ email: customerEmail });
    if (!user) {
      return res.status(201).send({
        success: false,
        message: "User not found",
      });
    }
    if (parseFloat(user?.balance) < parseFloat(pack.price)) {
      return res
        .status(201)
        .send({ success: false, message: "Balance is less for this order" });
    }

    const productPrice = pack?.price - (pack?.price * wd) / 100;
    const newBalance = Math.max(
      0,
      parseFloat(user?.balance) - parseFloat(productPrice)
    );
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
      mobile: customerNumber,
      balanceBefore: user?.balance,
      balanceAfter: newBalance,
      amount: productPrice,
      product: pack.amount,
      type: "order",
    });
    await newHistory.save();

    // GETTING PAYLOAD STARTS
    const fieldsPayload = {
      path: "product/product_detail",
      product_id: gameName,
    };

    const timestampp = Math.floor(Date.now() / 1000);
    const pathh = "product/product_detail";
    const authSignaturee = generateAuthSignature(
      fieldsPayload,
      timestampp,
      pathh
    );

    const moogold = await axios.post(
      "https://moogold.com/wp-json/v1/api/product/product_detail",
      fieldsPayload,
      {
        headers: {
          Authorization: generateBasicAuthHeader(),
          auth: authSignaturee,
          timestamp: timestampp,
        },
      }
    );

    if (moogold.data.err_code) {
      const order = new orderModel({
        orderId: orderId,
        api: "yes",
        pname: productName,
        amount: pack.amount,
        price: pack.price,
        discountedPrice: productPrice,
        customer_email: customerEmail,
        customer_mobile: customerNumber,
        userId: userid,
        zoneId: zoneid,
        originalPrice: pack.buyingprice,
        status: "failed",
        paymentMode: "wallet",
        apiName: "moogold",
      });
      await order.save();

      const err = new errModel({
        orderId: orderId,
        error: moogold.data.err_code,
        message: moogold.data.err_message,
      });
      await err.save();

      console.log(moogold.data);

      return res
        .status(201)
        .send({ success: false, message: "Incorrect Fields" });
    }
    //? GETTING FIELDS END

    //! CREATE ORDER MOOGOLD
    const payload = {
      path: "order/create_order",
      data: {
        category: 1,
        "product-id": productid,
        quantity: 1,
      },
    };

    moogold.data.fields.forEach((field, index) => {
      if (index === 0) {
        payload.data[field] = userid;
      } else if (index === 1) {
        payload.data[field] = zoneid;
      }
    });

    // GETTING PAYLOAD END

    const timestamp = Math.floor(Date.now() / 1000);
    const path = "order/create_order";
    const authSignature = generateAuthSignature(payload, timestamp, path);

    const response = await axios.post(
      "https://moogold.com/wp-json/v1/api/order/create_order",
      payload,
      {
        headers: {
          Authorization: generateBasicAuthHeader(),
          auth: authSignature,
          timestamp: timestamp,
        },
      }
    );

    if (response.data.err_code) {
      const order = new orderModel({
        orderId: orderId,
        api: "yes",
        amount: pack.amount,
        price: pack.price,
        discountedPrice: productPrice,
        pname: productName,
        customer_email: customerEmail,
        customer_mobile: customerNumber,
        userId: userid,
        zoneId: zoneid,
        originalPrice: pack.buyingprice,
        status: "failed",
        paymentMode: "wallet",
        apiName: "moogold",
      });
      await order.save();

      const err = new errModel({
        orderId: orderId,
        error: response.data.err_code,
        message: response.data.err_message,
      });
      await err.save();

      console.log(response.data);

      return res.status(201).send({ success: false, message: "Order Failed" });
    }

    const order = new orderModel({
      orderId: orderId,
      api: "yes",
      amount: pack.amount,
      price: pack.price,
      discountedPrice: productPrice,
      pname: productName,
      customer_email: customerEmail,
      customer_mobile: customerNumber,
      userId: userid,
      zoneId: zoneid,
      originalPrice: pack.buyingprice,
      status: "processing",
      paymentMode: "wallet",
      apiName: "moogold",
      mid: response.data.order_id,
    });
    await order.save();

    try {
      const dynamicData = {
        orderId: `${orderId}`,
        amount: `${pack.amount}`,
        price: `${pack.price}`,
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
  } catch (error) {
    console.log(error.message);
    return res.status(500).send({ error: error.message });
  }
});

module.exports = router;
