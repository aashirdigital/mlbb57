const express = require("express");
const multer = require("multer");
const fs = require("fs");
const {
  addProductController,
  getAllProductsController,
  getProductController,
  updateProductController,
  deleteProductController,
  getProductByCategoryController,
  getProductByNameController,
  getMobileLegendGameController,
} = require("../controllers/productCtrl");
const browserMiddleware = require("../middlewares/browserMiddleware");
const adminAuthMiddleware = require("../middlewares/adminAuthMiddleware");

// router object
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "productImages");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "--" + file.originalname.replace(/\s+/g, "-"));
  },
});

const upload = multer({ storage: storage });

// routes
router.post(
  "/add-product",
  upload.single("image"),
  adminAuthMiddleware,
  addProductController
);
router.post(
  "/update-product",
  upload.single("image"),
  adminAuthMiddleware,
  updateProductController
);
router.get("/get-all-products", browserMiddleware, getAllProductsController);
router.post("/get-product", browserMiddleware, getProductController);
router.post("/delete-product", adminAuthMiddleware, deleteProductController);
router.post(
  "/product-by-category",
  browserMiddleware,
  getProductByCategoryController
);
router.post(
  "/get-product-by-name",
  browserMiddleware,
  getProductByNameController
);
router.post(
  "/get-mobile-legend",
  browserMiddleware,
  getMobileLegendGameController
);

module.exports = router;
