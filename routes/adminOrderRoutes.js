const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const orderModel = require("../models/orderModel");
const productModel = require("../models/productModel");
const adminAuthMiddleware = require("../middlewares/adminAuthMiddleware");
const router = express.Router();

// ORDER SMILE
router.post("/smile", adminAuthMiddleware, async (req, res) => {
  try {
    const {
      orderId,
      userid,
      zoneid,
      region,
      productid,
      customer_email,
      customer_mobile,
      amount,
      price,
      pname,
      discount,
      originalPrice,
    } = req.body;

    if (
      !orderId ||
      !userid ||
      !zoneid ||
      !region ||
      !productid ||
      !customer_email ||
      !customer_mobile ||
      !amount ||
      !price ||
      !pname
    ) {
      return res.status(404).json({ message: "Invalid details" });
    }

    //HACKER CHECK
    const pp = await productModel.findOne({ name: pname });
    if (!pp) {
      return res.status(404).json({ message: "Product not found" });
    }
    const priceExists = pp.cost.some(
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

    const user = await userModel.findOne({ email: customer_email });
    if (!user) {
      return res.status(400).send({
        success: false,
        message: "User not found",
      });
    }
    if (user?.balance < parseFloat(price)) {
      return res
        .status(201)
        .send({ success: false, message: "Balance is less for this order" });
    }

    const newBalance = Math.max(0, user?.balance - price);
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
      balanceBefore: user?.balance,
      balanceAfter: newBalance,
      amount: price,
      product: amount,
      type: "order",
    });
    await newHistory.save();

    const uid = process.env.UID;
    const email = process.env.EMAIL;
    const product = "mobilelegends";
    const time = Math.floor(Date.now() / 1000);
    const mKey = process.env.KEY;
    const productId = productid.split("&");

    let orderResponse;
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
      orderResponse = await axios.post(apiUrl, formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
    }

    if (orderResponse.data.status === 200) {
      const order = new orderModel({
        api: "yes",
        orderId: orderId,
        p_info: pname,
        price: price,
        amount: amount,
        customer_email: customer_email,
        customer_mobile: customer_mobile,
        playerId: userid,
        userId: userid,
        zoneId: zoneid,
        originalPrice: originalPrice,
        status: "success",
        paymentMode: "wallet",
        apiName: "smileOne",
      });
      await order.save();

      // send mail
      try {
        const dynamicData = {
          orderId: `${orderId}`,
          amount: `${amount}`,
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

      return res
        .status(200)
        .send({ success: true, message: "Order Placed Successfully" });
    } else {
      const order = new orderModel({
        api: "yes",
        orderId: orderId,
        p_info: pname,
        price: price,
        amount: amount,
        customer_email: customer_email,
        customer_mobile: customer_mobile,
        playerId: userid,
        userId: userid,
        zoneId: zoneid,
        originalPrice: originalPrice,
        status: "failed",
        paymentMode: "wallet",
        apiName: "smileOne",
      });
      await order.save();
      return res.status(400).send({ success: false, message: "Order Failed" });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
