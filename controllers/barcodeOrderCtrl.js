const userModel = require("../models/userModel");
const orderModel = require("../models/orderModel");
const productModel = require("../models/productModel");
const md5 = require("md5");
const querystring = require("querystring");
const fs = require("fs");
const nodemailer = require("nodemailer");
const axios = require("axios");
const base64 = require("base-64");
const crypto = require("crypto");

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

// smile
const verifySmileOrderController = async (req, res) => {
  try {
    const order = await orderModel.findOne({
      orderId: req.body.orderId,
    });
    if (!order) {
      return res
        .status(201)
        .send({ success: false, message: "Order not found" });
    }
    if (order.status === "success") {
      return res
        .status(201)
        .send({ success: false, message: "Order already success" });
    }

    // price check
    const pp = await productModel.findOne({ name: order.pname });
    if (!pp) {
      return res
        .status(201)
        .send({ success: false, message: "Product not found" });
    }
    const priceExists = pp.cost.some(
      (item) =>
        item.amount === amount &&
        (parseFloat(item.price) ===
          parseFloat(Number(order.price) + Number(order.discount)) ||
          parseFloat(item.resPrice) ===
            parseFloat(Number(order.price) + Number(order.discount)))
    );
    if (!priceExists) {
      return res.status(201).json({
        message: "Amount does not match",
      });
    }

    // user check
    const user = await userModel.findOne({ email: order.customer_email });
    if (!user) {
      return res.status(201).send({
        success: false,
        message: "User not found",
      });
    }

    // smile order
    const uid = process.env.UID;
    const email = process.env.EMAIL;
    const product = "mobilelegends";
    const time = Math.floor(Date.now() / 1000);
    const mKey = process.env.KEY;
    const productId = order.productId.split("&");

    let orderResponse;
    for (let index = 0; index < productId.length; index++) {
      const signArr = {
        uid,
        email,
        product,
        time,
        userid: order.userId,
        zoneid: order.zoneId,
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
        userid: order.userId,
        zoneid: order.zoneId,
        product,
        productid: productId[index],
        time,
        sign,
      });
      let apiUrl =
        order.region === "brazil"
          ? "https://www.smile.one/br/smilecoin/api/createorder"
          : "https://www.smile.one/ph/smilecoin/api/createorder";
      orderResponse = await axios.post(apiUrl, formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
    }

    if (orderResponse.data.status === 200) {
      const updateOrder = await orderModel.findOneAndUpdate(
        {
          orderId: req.body.orderId,
        },
        { $set: { status: "success" } },
        { new: true }
      );

      // send mail
      try {
        const dynamicData = {
          orderId: `${req.body.orderId}`,
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

      return res.status(200).send({ success: true, message: "Order Success" });
    } else {
      // const updateOrder = await orderModel.findOneAndUpdate(
      //   {
      //     orderId: req.body.orderId,
      //   },
      //   { $set: { status: "failed" } },
      //   { new: true }
      // );
      // console.log(orderResponse.data);
      return res.status(201).send({ success: false, message: "Order Failed" });
    }
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
};
// moogold
const verifyMoogoldOrderController = async (req, res) => {
  try {
    const order = await orderModel.findOne({ orderId: req.body.orderId });
    if (!order) {
      return res
        .status(201)
        .send({ success: false, message: "Order not found" });
    }
    if (order.status === "success") {
      return res
        .status(201)
        .send({ success: false, message: "Order already success" });
    }

    // price check
    const pp = await productModel.findOne({ name: order.p_info });
    if (!pp) {
      return res
        .status(201)
        .send({ success: false, message: "Product not found" });
    }
    const priceExists = pp.cost.some(
      (item) =>
        item.amount === order.amount &&
        (parseFloat(item.price) ===
          parseFloat(Number(order.price) + Number(order.discount)) ||
          parseFloat(item.resPrice) ===
            parseFloat(Number(order.price) + Number(order.discount)))
    );
    if (!priceExists) {
      return res.status(201).json({
        message: "Amount does not match",
      });
    }

    // user check
    const user = await userModel.findOne({ email: order.customer_email });
    if (!user) {
      return res.status(201).send({
        success: false,
        message: "User not found",
      });
    }

    // GETTING PAYLOAD STARTS
    const fieldsPayload = {
      path: "product/product_detail",
      product_id: order.gameId,
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
      // const updateOrder = await orderModel.findOneAndUpdate(
      //   {
      //     orderId: req.body.orderId,
      //   },
      //   { $set: { status: "failed" } },
      //   { new: true }
      // );
      console.log(moogold.data);
      return res.status(201).send({ success: false, message: "Order Failed" });
    }
    //? GETTING FIELDS END

    //! CREATE ORDER MOOGOLD
    const payload = {
      path: "order/create_order",
      data: {
        category: 1,
        "product-id": order.productId,
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
      // const updateOrder = await orderModel.findOneAndUpdate(
      //   {
      //     orderId: req.body.orderId,
      //   },
      //   { $set: { status: "failed" } },
      //   { new: true }
      // );
      console.log(response.data);
      return res.status(201).send({ success: false, message: "Order Failed" });
    }

    const updateOrder = await orderModel.findOneAndUpdate(
      {
        orderId: req.body.orderId,
      },
      { $set: { status: "success" } },
      { new: true }
    );

    try {
      const dynamicData = {
        orderId: `${req.body.orderId}`,
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

    return res.status(200).send({ success: true, message: "Order Success" });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
};
// reject order
const rejectOrderController = async (req, res) => {
  try {
    const order = await orderModel.findOne({ orderId: req.body.orderId });
    if (!order) {
      return res
        .status(201)
        .send({ success: false, message: "No order found" });
    }
    const rejectOrder = await orderModel.findOneAndUpdate(
      {
        orderId: req.body.orderId,
      },
      { $set: { status: "cancelled" } },
      { new: true }
    );
    if (!rejectOrder) {
      return res
        .status(201)
        .send({ success: false, message: "Failed to reject" });
    }
    return res.status(200).send({ success: true, message: "Order Rejected" });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  verifySmileOrderController,
  verifyMoogoldOrderController,
  rejectOrderController,
};
