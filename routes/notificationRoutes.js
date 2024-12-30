const express = require("express");
const multer = require("multer");
const notificationModel = require("../models/notificationModel");
const path = require("path"); // Add this line to import the path module
const fs = require("fs");
const browserMiddleware = require("../middlewares/browserMiddleware");
const adminAuthMiddleware = require("../middlewares/adminAuthMiddleware");
// router object
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "notificationImages");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "--" + file.originalname.replace(/\s+/g, "-"));
  },
});
const upload = multer({ storage: storage });

// routes
router.post(
  "/update-noti",
  adminAuthMiddleware,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "popupImage", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const existingNoti = await notificationModel.findOne({
        _id: "662a60404ee7482cbd969a25",
      });
      if (!existingNoti) {
        return res
          .status(201)
          .send({ success: false, message: "No Notification Found" });
      }
      let imagePath;
      let imagePathTwo;

      if (req.files && req.files.image && req.files.image[0]) {
        imagePath = req.files.image[0].path;
      }
      if (req.files && req.files.popupImage && req.files.popupImage[0]) {
        imagePathTwo = req.files.popupImage[0].path;
      }

      const noti = await notificationModel.findOneAndUpdate(
        {
          _id: "662a60404ee7482cbd969a25",
        },
        {
          $set: {
            image: req.files ? imagePath : existingNoti.image,
            popupImage: req.files ? imagePathTwo : existingNoti.popupImage,
            popupImageLink: req.body.popupImageLink,
            popupImageStatus: req.body.popupImageStatus,
            link: req.body.link,
            display: req.body.display,
            desc: req.body.desc,
          },
        },
        { new: true }
      );
      if (!noti) {
        return res
          .status(202)
          .send({ success: false, message: "Failed to update" });
      }
      return res
        .status(200)
        .send({ success: true, message: "Notification Updated successfully" });
    } catch (error) {
      return res.status(500).send({ success: false, message: error.message });
    }
  }
);

router.get("/get-noti", async (req, res) => {
  try {
    const noti = await notificationModel.find({});
    if (noti.length === 0) {
      return res
        .status(201)
        .send({ success: false, message: "No Notification found" });
    }
    return res.status(200).send({
      success: true,
      message: "Notification fetched success",
      data: noti,
    });
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
