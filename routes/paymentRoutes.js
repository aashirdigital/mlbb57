const express = require("express");
const axios = require("axios");
const paymentModel = require("../models/paymentModel");
const md5 = require("md5");
const querystring = require("querystring");
const browserMiddleware = require("../middlewares/browserMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");
const adminAuthMiddleware = require("../middlewares/adminAuthMiddleware");

// Create an Express Router
const router = express.Router();

router.get("/get-all-payments", adminAuthMiddleware, async (req, res) => {
  try {
    const payments = await paymentModel.find({});
    if (payments.length === 0) {
      return res
        .status(200)
        .send({ success: false, message: "No Payment Found" });
    }
    return res.status(201).send({
      success: true,
      message: "All Payments Fetched",
      data: payments,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal server error" });
  }
});
router.post("/get-user-payments", authMiddleware, async (req, res) => {
  try {
    const payments = await paymentModel.find({ mobile: req.body.mobile });
    if (payments.length === 0) {
      return res
        .status(200)
        .send({ success: false, message: "No payments found" });
    }
    return res.status(201).send({
      success: true,
      message: "Payments Fetched Success",
      data: payments,
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: `Get Barcode Payment Ctrl ${error.message}`,
    });
  }
});

// get role
router.post("/get-role", browserMiddleware, async (req, res) => {
  try {
    const { userid, zoneid, productid, region } = req.body;
    const uid = process.env.UID;
    const email = process.env.EMAIL;
    const product = "mobilelegends";
    const time = Math.floor(Date.now() / 1000);
    const mKey = process.env.KEY;

    // GENERATING SIGN
    const signArr = {
      uid,
      email,
      product,
      time,
      userid,
      zoneid,
      productid,
    };
    const sortedSignArr = Object.fromEntries(Object.entries(signArr).sort());
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
      userid,
      zoneid,
      product,
      productid,
      time,
      sign,
    });
    let apiUrl =
      region === "brazil"
        ? "https://www.smile.one/br/smilecoin/api/getrole"
        : "https://www.smile.one/ph/smilecoin/api/getrole";
    let role;
    role = await axios.post(apiUrl, formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    if (role.data.status === 200) {
      return res.status(200).send({
        success: true,
        username: role.data.username,
        zone: role.data.zone,
        message: role.data.message,
      });
    } else {
      return res
        .status(201)
        .send({ success: false, message: role.data.message });
    }
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
});

module.exports = router;
