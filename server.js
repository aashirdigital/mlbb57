const express = require("express");
const path = require("path");
const colors = require("colors");
const morgan = require("morgan"); // corrected spelling
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const startCronJobs = require("./cronJobs");
var cors = require("cors");

// dotenv
dotenv.config();
//mongodb connection
connectDB();
// rest object
const app = express();
app.use(cors());
app.use(cookieParser());
//START CRON JOBS
startCronJobs();

app.use(
  session({
    secret: "TOPCREDTIS@#$123",
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 3 * 60 * 1000,
    },
  })
);

// middlewares
app.use(
  cors({
    origin: `${process.env.BASE_URL}`,
    credentials: true,
  })
);
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(morgan("dev"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static("build"));

// Middleware to check referer
function checkReferer(req, res, next) {
  const referer = req.headers.referer;
  const allowedDomains = [
    `${process.env.BASE_URL}`,
    `${process.env.BASE_URL}/`,
    `${process.env.BASE_URL_TWO}`,
    `${process.env.BASE_URL_TWO}/`,
    "https://pgateway.in",
    "http://localhost:3000",
    "http://localhost:8080",
  ];
  if (referer && allowedDomains.some((domain) => referer.startsWith(domain))) {
    next();
  } else {
    res.status(403).json({ message: "Forbidden" });
  }
}
// app.use("/api", checkReferer);

// Static file for images
app.use(
  "/productImages",
  express.static(path.join(__dirname, "productImages"))
);
app.use("/admin-products", express.static("productImages"));
app.use("/admin-edit-product/:id", express.static("productImages"));
app.use("/admin-view-order/:id", express.static("productImages"));
app.use("/product/", express.static("productImages"));
app.use("/product/:name", express.static("productImages"));
//! GALLERY
app.use("/gallery", express.static(path.join(__dirname, "gallery")));
app.use("/gallery", express.static("gallery"));
app.use("/product/:name", express.static("gallery"));
//! NOTIFICATION
app.use(
  "/notificationImages",
  express.static(path.join(__dirname, "notificationImages"))
);
app.use("/announcement", express.static("notificationImages"));
//! BANNER
app.use("/banners", express.static(path.join(__dirname, "banners")));
app.use("/admin-banners", express.static("banners"));
//! PROMO
app.use("/promoImg", express.static(path.join(__dirname, "promoImg")));
app.use("/admin-promo", express.static("promoImg"));
app.use("/promo/:id", express.static("promoImg"));
//! PAYMENT MODE BAROCDE
app.use("/barcode", express.static(path.join(__dirname, "barcode")));
app.use("/admin-settings", express.static("barcode"));
app.use("/product/:name", express.static("barcode"));
//! WALLET PAYMENT MODE BAROCDE
app.use(
  "/walletBarcode",
  express.static(path.join(__dirname, "walletBarcode"))
);
app.use("/admin-wallet-settings", express.static("walletBarcode"));
app.use("/wallet", express.static("walletBarcode"));

// routes
app.use("/api/user/", require("./routes/userRoutes"));
app.use("/api/image/", require("./routes/imageUploadRoutes"));
app.use("/api/contact/", require("./routes/contactRoutes"));
app.use("/api/admin/", require("./routes/adminRoutes"));
app.use("/api/product/", require("./routes/productRoutes"));
app.use("/api/order/", require("./routes/orderRoutes"));
app.use("/api/image/", require("./routes/imageRoutes"));
app.use("/api/noti/", require("./routes/notificationRoutes"));
app.use("/api/payment/", require("./routes/paymentRoutes"));
app.use("/api/otp/", require("./routes/otpRoutes"));
app.use("/api/moogold/", require("./routes/moogoldRoutes"));
app.use("/api/banner/", require("./routes/bannerRoutes"));
app.use("/api/promo/", require("./routes/promoRoutes"));
app.use("/api/leaderboard/", require("./routes/leaderboardRoutes"));
// payment mode
app.use("/api/paymentmode/", require("./routes/paymentModeRoutes"));
app.use("/api/walletMode/", require("./routes/walletPaymentModeRoutes"));
// order
app.use("/api/smile/", require("./routes/smileRoutes"));
app.use("/api/moogold/", require("./routes/moogoldRoutes"));
app.use("/api/manual/", require("./routes/manualRoutes"));
app.use("/api/wallet/", require("./routes/walletRoutes"));
app.use("/api/wallet/", require("./routes/walletHistoryRoutes"));

// PORT
const port = process.env.PORT || 8080;

// STATIC FILES RUNNING ON BUILD FOLDER
if (process.env.NODE_MODE === "production") {
  app.use(express.static(path.join(__dirname, "./client/build")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "./client/build/index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.send("API running..");
  });
}

// Listen
app.listen(port, (req, res) => {
  console.log(
    `Server running in ${process.env.NODE_MODE} Mode on Port ${process.env.PORT}`
      .bgCyan
  );
});
