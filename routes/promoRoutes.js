const express = require("express");
const multer = require("multer");
const promoModel = require("../models/promoModel");
const adminAuthMiddleware = require("../middlewares/adminAuthMiddleware");
const router = express.Router();
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "promoImg");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "--" + file.originalname.replace(/\s+/g, "-"));
  },
});

const upload = multer({ storage: storage });

router.post(
  "/add-promo",
  upload.single("image"),
  adminAuthMiddleware,
  async (req, res) => {
    const { title, date, category, description } = req.body;
    const image = req.file.path;

    try {
      const newPromo = new promoModel({
        image,
        title,
        date,
        category,
        description,
      });
      await newPromo.save();
      res
        .status(200)
        .json({ success: true, message: "Promo added successfully!" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Failed to add promo." });
    }
  }
);

router.get("/get-promos", async (req, res) => {
  try {
    const promos = await promoModel.find({});
    if (!promos || promos.length === 0) {
      return res
        .status(201)
        .send({ success: false, message: "No Promo Found" });
    }
    return res
      .status(200)
      .send({ success: true, message: "Promo Fetched Success", data: promos });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to add promo." });
  }
});

router.post("/delete-promo", adminAuthMiddleware, async (req, res) => {
  try {
    const promos = await promoModel.findByIdAndDelete(req.body.id);
    if (!promos) {
      return res
        .status(201)
        .send({ success: false, message: "Failed to Delete" });
    }
    fs.unlinkSync(req.body.image);
    return res
      .status(200)
      .send({ success: true, message: "Promo Deleted Success" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to add promo." });
  }
});

router.post("/get-promo", async (req, res) => {
  try {
    const promo = await promoModel.findOne({ _id: req.body.id });
    if (!promo) {
      return res
        .status(201)
        .send({ success: false, message: "No Promo Found" });
    }
    return res
      .status(200)
      .send({ success: true, message: "Promo Fetched", data: promo });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to add promo." });
  }
});

module.exports = router;
