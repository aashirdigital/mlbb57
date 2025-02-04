const multer = require("multer");
const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const adminAuthMiddleware = require("../middlewares/adminAuthMiddleware");
const {
  getAllUserController,
  getUserController,
  editUserController,
  adminGetAllOrdersController,
  adminUpdateOrderController,
  getAllQueries,
  seenQueryController,
  updateWebsiteController,
  getWebsiteContoller,
  getAllCoupons,
  addCouponController,
  deleteCouponController,
  adminAddMoneyController,
  AdminDashboardController,
  smileBalanceController,
  moogoldBalanceContoller,
  deleteUserController,
} = require("../controllers/AdminCtrl");
const {
  verifySmileOrderController,
  verifyMoogoldOrderController,
  rejectOrderController,
} = require("../controllers/barcodeOrderCtrl");

// router object
const router = express.Router();
// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "adsImages");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "--" + file.originalname.replace(/\s+/g, "-"));
  },
});

const upload = multer({ storage: storage });

// ============== USERS
router.get("/get-all-users", adminAuthMiddleware, getAllUserController);
router.post("/get-user", adminAuthMiddleware, getUserController);
router.post("/admin-edit-user", adminAuthMiddleware, editUserController);
router.post("/deleteuser", adminAuthMiddleware, deleteUserController);
// ============== ORDERS
router.get(
  "/admin-get-all-orders",
  adminAuthMiddleware,
  adminGetAllOrdersController
);
router.post("/update-order", adminAuthMiddleware, adminUpdateOrderController);
// ============== QUERIES
router.get("/get-all-queries", adminAuthMiddleware, getAllQueries);
router.post("/query-seen", adminAuthMiddleware, seenQueryController);

router.get("/get-website", getWebsiteContoller);
router.post("/update-website", adminAuthMiddleware, updateWebsiteController);

// ============== COUPON
router.get("/get-coupons", getAllCoupons);
router.post("/add-coupon", adminAuthMiddleware, addCouponController);
router.post("/delete-coupon", adminAuthMiddleware, deleteCouponController);
// ============== WALLET
router.post("/add-money", adminAuthMiddleware, adminAddMoneyController);
router.get("/get-dashboard", adminAuthMiddleware, AdminDashboardController);
// ============== BARCODE ORDER
// router.post(
//   "/verifySmileOrder",
//   adminAuthMiddleware,
//   verifySmileOrderController
// );
// router.post(
//   "/verifyMoogoldOrder",
//   adminAuthMiddleware,
//   verifyMoogoldOrderController
// );
// router.post("/rejectOrder", adminAuthMiddleware, rejectOrderController);
// BALANCE
router.get("/smile-balance", adminAuthMiddleware, smileBalanceController);
router.get("/moogold-balance", adminAuthMiddleware, moogoldBalanceContoller);

module.exports = router;
