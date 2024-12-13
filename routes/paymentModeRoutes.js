const express = require("express");
const multer = require("multer");
const paymentModeModel = require("../models/paymentModeModel");
const adminAuthMiddleware = require("../middlewares/adminAuthMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "barcode");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "--" + file.originalname.replace(/\s+/g, "-"));
  },
});
const upload = multer({ storage: storage });

router.post(
  "/set-mode",
  adminAuthMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      let imagePath;
      if (req.file) {
        imagePath = req.file.path;
      }
      const mode = await paymentModeModel.findOne({});
      if (!mode) {
        const newMode = new paymentModeModel({
          paymentMode: req.body.paymentMode,
          desc: req.body.desc,
          image: imagePath,
        });
        await newMode.save();
      }
      const updateMode = await paymentModeModel.findOneAndUpdate(
        {},
        {
          $set: {
            paymentMode: req.body.paymentMode,
            desc: req.body.desc,
            image: imagePath,
          },
        },
        { new: true }
      );
      if (!updateMode) {
        return res
          .status(400)
          .send({ success: false, message: "Failed to update" });
      }
      return res
        .status(200)
        .send({ success: true, message: "Payment mode updated" });
    } catch (error) {
      return res.status(500).send({ success: false, message: error.message });
    }
  }
);

router.get("/get-mode", authMiddleware, async (req, res) => {
  try {
    const mode = await paymentModeModel.findOne({});
    if (!mode) {
      return res.status(400).send({ success: false, message: "No mode found" });
    }
    return res
      .status(200)
      .send({ success: true, message: "Mode fetched success", data: mode });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
});

module.exports = router;
