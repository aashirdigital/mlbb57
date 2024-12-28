const express = require("express");
const multer = require("multer");
const galleryModel = require("../models/galleryModel");
const path = require("path"); // Add this line to import the path module
const fs = require("fs");
const browserMiddleware = require("../middlewares/browserMiddleware");
const adminAuthMiddleware = require("../middlewares/adminAuthMiddleware");
// router object
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "gallery");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "--" + file.originalname.replace(/\s+/g, "-"));
  },
});
const upload = multer({ storage: storage });

// routes
router.post(
  "/upload",
  adminAuthMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      // Check if file is uploaded
      if (!req.file) {
        return res
          .status(201)
          .send({ success: false, message: "No file uploaded" });
      }
      const imagePath = req.file.path;
      const newImage = new galleryModel({ image: imagePath });
      await newImage.save();
      return res
        .status(200)
        .send({ success: true, message: "Image uploaded successfully" });
    } catch (error) {
      return res.status(500).send({ success: false, message: error.message });
    }
  }
);

router.get("/get-images", async (req, res) => {
  try {
    const images = await galleryModel.find({});
    if (images.length === 0) {
      return res
        .status(201)
        .send({ success: false, message: "No image found" });
    }
    return res
      .status(200)
      .send({ success: true, message: "Image fetched success", data: images });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
});

router.post("/delete", adminAuthMiddleware, async (req, res) => {
  try {
    const image = await galleryModel.findOne({ _id: req.body.id });
    if (!image) {
      return res
        .status(201)
        .send({ success: false, message: "No image found" });
    }
    const deleteImage = await galleryModel.findOneAndDelete({
      _id: req.body.id,
    });
    if (!deleteImage) {
      return res.status(202).send({
        success: false,
        message: "Failed to delete",
      });
    }
    const fullPath = path.join(__dirname, "..", image.image);
    fs.unlinkSync(fullPath);

    return res
      .status(200)
      .send({ success: true, message: "Image delete success" });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
});

module.exports = router;
