const express = require("express");
const axios = require("axios");
const paymentModel = require("../models/paymentModel");
const md5 = require("md5");
const querystring = require("querystring");
const browserMiddleware = require("../middlewares/browserMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");
const adminAuthMiddleware = require("../middlewares/adminAuthMiddleware");
const router = express.Router();

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
    const { userid, zoneid, apiName, gameName } = req.body;

    let response;
    if (apiName === "smileOne") {
      const uid = process.env.UID;
      const email = process.env.EMAIL;
      const product = "mobilelegends";
      const time = Math.floor(Date.now() / 1000);
      const mKey = process.env.KEY;

      const productid = "212";
      const region = "philliphines";

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
      response = await axios.post(apiUrl, formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      if (response.data.status === 200) {
        return res.status(200).send({
          success: true,
          username: response.data.username,
          zone: response.data.zone,
          message: response.data.message,
          use: response.data.use,
          apiName: "sm",
        });
      } else {
        return res
          .status(200)
          .send({ success: false, message: response.data.message });
      }
    } else if (apiName === "moogold") {
      //? GETTING FIELDS
      const fieldsPayload = {
        path: "product/product_detail",
        product_id: gameName,
      };

      const timestamp = Math.floor(Date.now() / 1000);
      const path = "product/product_detail";
      const authSignature = generateAuthSignature(
        fieldsPayload,
        timestamp,
        path
      );

      const moogold = await axios.post(
        "https://moogold.com/wp-json/v1/api/product/product_detail",
        fieldsPayload,
        {
          headers: {
            Authorization: generateBasicAuthHeader(),
            auth: authSignature,
            timestamp: timestamp,
          },
        }
      );

      //! CREATE ORDER MOOGOLD
      const payload = {
        path: "product/validate",
        data: {
          "product-id": gameName,
        },
      };

      moogold.data.fields?.forEach((field, index) => {
        if (index === 0) {
          payload.data[field] = userid;
        } else if (index === 1) {
          payload.data[field] = zoneid;
        }
      });

      console.log(payload);

      const timestampp = Math.floor(Date.now() / 1000);
      const pathh = "product/validate";

      const authSignaturee = generateAuthSignature(payload, timestampp, pathh);

      try {
        response = await axios.post(
          "https://moogold.com/wp-json/v1/api/product/validate",
          payload,
          {
            headers: {
              Authorization: generateBasicAuthHeader(),
              auth: authSignaturee,
              timestamp: timestampp,
            },
          }
        );

        console.log(response);
        return res.status(200).send({
          success: true,
          message: "Product Validated",
          data: response.data,
          username: response.data.username,
          apiName: "mg",
        });
      } catch (error) {
        console.log(error.message);
      }
    } else if (apiName === "yokcash") {
    }
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
});

module.exports = router;
