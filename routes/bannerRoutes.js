const express = require("express");
const multer = require("multer");
const bannerModel = require("../models/bannerModel");
const SlideTextModel = require("../models/slideTextModel.js");
const adminAuthMiddleware = require("../middlewares/adminAuthMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "banners");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "--" + file.originalname.replace(/\s+/g, "-"));
  },
});
const upload = multer({ storage: storage });

const storageTwo = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "newsBanner");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "--" + file.originalname.replace(/\s+/g, "-"));
  },
});
const uploadTwo = multer({ storage: storage });

// Routes
router.post(
  "/add-banner",
  upload.single("image"),
  adminAuthMiddleware,
  async (req, res) => {
    try {
      const { link } = req.body;
      const banner = new bannerModel({
        image: req.file.path,
        link: link,
      });
      await banner.save();
      return res
        .status(200)
        .send({ success: true, message: "Banner uploaded successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

router.post(
  "/add-news-banner",
  uploadTwo.single("image"),
  adminAuthMiddleware,
  async (req, res) => {
    try {
      const { link } = req.body;

      const updateBanner = await newsBannerModel.findOneAndUpdate(
        { _id: req.body.id },
        { $set: { image: req.file.path, link: link } },
        { new: true }
      );
      if (!updateBanner) {
        return res.status(201).send({
          success: false,
          message: "Failed to update",
        });
      }
      return res
        .status(200)
        .send({ success: true, message: "News Banner updated successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

router.get("/get-banners", async (req, res) => {
  try {
    const banners = await bannerModel.find({});
    if (!banners || banners.length === 0) {
      return res
        .status(201)
        .send({ success: false, message: "No Banner Found" });
    }
    return res.status(200).send({
      success: true,
      message: "Banner Fetched Success",
      data: banners,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/get-news-banner", async (req, res) => {
  try {
    const banners = await newsBannerModel.find({});
    if (!banners || banners.length === 0) {
      return res
        .status(201)
        .send({ success: false, message: "No Banner Found" });
    }
    return res.status(200).send({
      success: true,
      message: "Banner Fetched Success",
      data: banners[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/delete-banner", adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.body;
    const deleteBanner = await bannerModel.findOneAndDelete({ _id: id });
    if (!deleteBanner) {
      return res
        .status(201)
        .send({ success: false, message: "Failed to delete banner" });
    }
    return res.status(200).send({
      success: true,
      message: "Banner deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/slide-text", adminAuthMiddleware, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).send({
        success: false,
        message: "Text is required",
      });
    }

    await SlideTextModel.saveSingleDocument({ text });

    return res.status(200).send({
      success: true,
      message: "Text saved successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/get-slide-text", async (req, res) => {
  try {
    const text = await SlideTextModel.find({});
    if (!text || text.length === 0) {
      return res.status(201).send({
        success: false,
        message: "No Text Found",
      });
    }
    return res.status(200).send({
      success: true,
      message: "Text Found",
      data: text[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
