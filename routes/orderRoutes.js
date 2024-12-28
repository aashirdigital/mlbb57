const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const orderModel = require("../models/orderModel");
const productModel = require("../models/productModel");
const adminAuthMiddleware = require("../middlewares/adminAuthMiddleware");
const router = express.Router();

// GET
router.post("/get-user-orders", authMiddleware, async (req, res) => {
  try {
    const orders = await orderModel.find({ customer_mobile: req.body.mobile });
    if (orders.length === 0) {
      return res.status(200).send({
        success: false,
        message: "No Order Found",
      });
    }
    return res.status(201).send({
      success: true,
      message: "All Orders Fetched Success",
      data: orders,
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: `Get All Orders Ctrl ${error.message}`,
    });
  }
});
// ALL ORDERS
router.get("/allorders", adminAuthMiddleware, async (req, res) => {
  try {
    const orders = await orderModel.find({});
    if (!orders || orders.length === 0) {
      return res
        .status(200)
        .send({ success: false, message: "No Orders Found" });
    }

    const totalAmount = await orderModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: { $toDouble: "$price" } },
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
        },
      },
    ]);
    return res.status(201).send({
      success: true,
      message: "All Orders Fetched Success",
      data: orders,
      total: totalAmount.length > 0 ? totalAmount[0].total : 0,
    });
  } catch (error) {
    console.error("Error in adminGetAllOrdersController:", error);
    res.status(500).send({
      success: false,
      message: `Admin Get All Order Ctrl ${error.message}`,
    });
  }
});
// GET BARCODE ORDERS
router.get("/getbarcodeorders", adminAuthMiddleware, async (req, res) => {
  try {
    const orders = await orderModel.find({
      paymentMode: "barcode",
      api: "yes",
    });
    if (orders.length === 0) {
      return res.status(201).send({
        success: false,
        message: "No Order Found",
      });
    }
    return res.status(200).send({
      success: true,
      message: "All Orders Fetched Success",
      data: orders,
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});
// GET ORDER BY ID
router.post("/get-order-by-id", authMiddleware, async (req, res) => {
  try {
    const order = await orderModel.findOne({
      orderId: req.body.orderId,
    });
    if (!order) {
      return res.status(200).send({
        success: false,
        message: "No Order Found",
      });
    }
    return res.status(201).send({
      success: true,
      message: "Order Fetched Success",
      data: order,
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: `Get Order By Id Ctrl ${error.message}`,
    });
  }
});
// =========== ORDER
// CREATE SMILEONE
router.post("/smile", authMiddleware, async (req, res) => {
  try {
    const {
      api,
      orderId,
      userid,
      zoneid,
      customer_email,
      customer_mobile,
      pname,
      amount,
      price,
      discount,
      originalPrice,
      apiName,
      utr,
      productId,
      region,
      gameId,
    } = req.body;

    if (
      !orderId ||
      !userid ||
      !customer_email ||
      !customer_mobile ||
      !pname ||
      !amount ||
      !utr ||
      !price
    ) {
      return res
        .status(201)
        .send({ success: false, message: "Invalid details" });
    }

    const existingOrder = await orderModel.findOne({
      orderId: orderId,
    });
    if (existingOrder) {
      return res.redirect(`${process.env.BASE_URL}/user-dashboard`);
    }

    const existingUtr = await orderModel.findOne({
      utr: utr,
    });
    if (existingUtr) {
      return res
        .status(201)
        .send({ success: false, message: "UTR number already exists" });
    }

    //HACKER CHECK
    const product = await productModel.findOne({ name: pname });
    if (!product) {
      return res.status(404).send({ message: "Product not found" });
    }
    const priceExists = product.cost.some(
      (item) =>
        item.amount === amount &&
        (parseFloat(item.price) ===
          parseFloat(Number(price) + Number(discount)) ||
          parseFloat(item.resPrice) ===
            parseFloat(Number(price) + Number(discount)))
    );
    if (!priceExists) {
      return res.status(400).json({
        message: "Amount does not match",
      });
    }

    const newOrder = new orderModel({
      api: api,
      amount: amount,
      price: price,
      customer_email: customer_email,
      customer_mobile: customer_mobile,
      pname: pname,
      userId: userid,
      zoneId: zoneid,
      orderId: orderId,
      originalPrice: originalPrice,
      paymentMode: "barcode",
      apiName: apiName,
      utr: utr,
      status: "pending",
      productId: productId,
      region: region,
      gameId: gameId,
      discount: discount || 0,
    });
    await newOrder.save();

    // SEND MAIL TO USER
    // try {
    //   const dynamicData = {
    //     orderId: `${orderId}`,
    //     amount: `${amount}`,
    //     price: `${price}`,
    //     p_info: `${pname}`,
    //     userId: `${userid}`,
    //     zoneId: `${zoneid}`,
    //   };
    //   let htmlContent = fs.readFileSync("order.html", "utf8");
    //   Object.keys(dynamicData).forEach((key) => {
    //     const placeholder = new RegExp(`{${key}}`, "g");
    //     htmlContent = htmlContent.replace(placeholder, dynamicData[key]);
    //   });
    //   // Send mail
    //   let mailTransporter = nodemailer.createTransport({
    //     service: "gmail",
    //     auth: {
    //       user: process.env.MAIL,
    //       pass: process.env.APP_PASS,
    //     },
    //   });
    //   let mailDetails = {
    //     from: process.env.MAIL,
    //     to: `${customer_email}`,
    //     subject: "Order Successful!",
    //     html: htmlContent,
    //   };
    //   mailTransporter.sendMail(mailDetails, function (err, data) {
    //     if (err) {
    //       console.log(err);
    //     }
    //   });
    // } catch (error) {
    //   console.error("Error sending email:", error);
    // }

    return res
      .status(200)
      .send({ success: true, message: "Order Placed Successfully" });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
});
// CREATE MOOGOLD
router.post("/moogold", authMiddleware, async (req, res) => {
  try {
    const {
      api,
      orderId,
      userid,
      zoneid,
      customer_email,
      customer_mobile,
      pname,
      amount,
      price,
      originalPrice,
      apiName,
      utr,
      productId,
      region,
      gameId,
      discount,
    } = req.body;

    if (
      !orderId ||
      !userid ||
      !customer_email ||
      !customer_mobile ||
      !pname ||
      !amount ||
      !utr ||
      !price
    ) {
      return res
        .status(201)
        .send({ success: false, message: "Invalid details" });
    }

    const existingOrder = await orderModel.findOne({
      orderId: orderId,
      status: "success",
    });
    if (existingOrder) {
      return res.redirect(`${process.env.BASE_URL}/failure`);
    }

    const existingUtr = await orderModel.findOne({
      utr: utr,
    });
    if (existingUtr) {
      return res
        .status(201)
        .send({ success: false, message: "UTR number already exists" });
    }

    //HACKER CHECK
    const product = await productModel.findOne({ name: pname });
    if (!product) {
      return res.status(404).send({ message: "Product not found" });
    }
    const priceExists = product.cost.some(
      (item) =>
        item.amount === amount &&
        (parseFloat(item.price) ===
          parseFloat(Number(price) + Number(discount)) ||
          parseFloat(item.resPrice) ===
            parseFloat(Number(price) + Number(discount)))
    );
    if (!priceExists) {
      return res.status(400).json({
        message: "Amount does not match",
      });
    }

    const newOrder = new orderModel({
      api: api,
      amount: amount,
      price: price,
      customer_email: customer_email,
      customer_mobile: customer_mobile,
      pname: pname,
      userId: userid,
      zoneId: zoneid,
      orderId: orderId,
      originalPrice: originalPrice,
      paymentMode: "barcode",
      apiName: apiName,
      utr: utr,
      status: "pending",
      productId: productId,
      region: region,
      gameId: gameId,
      discount: discount || 0,
    });
    await newOrder.save();

    // SEND MAIL TO USER
    // try {
    //   const dynamicData = {
    //     orderId: `${orderId}`,
    //     amount: `${amount}`,
    //     price: `${price}`,
    //     p_info: `${pname}`,
    //     userId: `${userid}`,
    //     zoneId: `${zoneid}`,
    //   };
    //   let htmlContent = fs.readFileSync("order.html", "utf8");
    //   Object.keys(dynamicData).forEach((key) => {
    //     const placeholder = new RegExp(`{${key}}`, "g");
    //     htmlContent = htmlContent.replace(placeholder, dynamicData[key]);
    //   });
    //   // Send mail
    //   let mailTransporter = nodemailer.createTransport({
    //     service: "gmail",
    //     auth: {
    //       user: process.env.MAIL,
    //       pass: process.env.APP_PASS,
    //     },
    //   });
    //   let mailDetails = {
    //     from: process.env.MAIL,
    //     to: `${customer_email}`,
    //     subject: "Order Successful!",
    //     html: htmlContent,
    //   };
    //   mailTransporter.sendMail(mailDetails, function (err, data) {
    //     if (err) {
    //       console.log(err);
    //     }
    //   });
    // } catch (error) {
    //   console.error("Error sending email:", error);
    // }

    return res
      .status(200)
      .send({ success: true, message: "Order Placed Successfully" });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
});
// CREATE MANUAL
router.post("/manual", authMiddleware, async (req, res) => {
  try {
    const {
      api,
      orderId,
      userid,
      zoneid,
      customer_email,
      customer_mobile,
      pname,
      discount,
      prodId,
      utr,
    } = req.body;

    if (
      !orderId ||
      !userid ||
      !customer_email ||
      !customer_mobile ||
      !pname ||
      !prodId ||
      !utr
    ) {
      return res
        .status(201)
        .send({ success: false, message: "Invalid details" });
    }

    const existingOrder = await orderModel.findOne({
      orderId: orderId,
      status: "success",
    });
    if (existingOrder) {
      return res.redirect(`${process.env.BASE_URL}/failure`);
    }

    const existingUtr = await orderModel.findOne({
      utr: utr,
    });
    if (existingUtr) {
      return res
        .status(201)
        .send({ success: false, message: "UTR number already exists" });
    }

    // searching product
    const prod = await productModel.findOne({ name: pname });
    if (!prod) {
      return res.redirect(`${process.env.BASE_URL}/failure`);
    }

    // searching pack
    const pack = prod.cost.filter((item) => item.prodId === prodId)[0];

    const newOrder = new orderModel({
      api: api,
      amount: pack.amount,
      price: pack.price,
      customer_email: customer_email,
      customer_mobile: customer_mobile,
      pname: pname,
      userId: userid,
      zoneId: zoneid,
      orderId: orderId,
      originalPrice: pack.buyingprice,
      paymentMode: "barcode",
      apiName: "manual",
      utr: utr,
      status: "pending",
      discount: discount || 0,
    });
    await newOrder.save();

    return res
      .status(200)
      .send({ success: true, message: "Order Placed Successfully" });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
});

module.exports = router;
