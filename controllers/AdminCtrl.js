const axios = require("axios");
const userModel = require("../models/userModel");
const orderModel = require("../models/orderModel");
const paymentModel = require("../models/paymentModel");
const couponModel = require("../models/couponModel");
const websiteModel = require("../models/websiteModel");
const contactModel = require("../models/contactModel");
const productModel = require("../models/productModel");
const walletHistoryModel = require("../models/walletHistoryModel");
const registerWalletModel = require("../models/registerWalletModel");
const md5 = require("md5");
const querystring = require("querystring");
const crypto = require("crypto");
const base64 = require("base-64");
const sendMail = require("./sendMail");

const getAllUserController = async (req, res) => {
  try {
    const allUser = await userModel.find({
      email: {
        $nin: ["coinssups@gmail.com", "aashirdigital@gmail.com"],
      },
    });
    if (!allUser) {
      return res.status(200).send({ success: false, message: "No User Found" });
    }
    return res.status(200).send({
      success: true,
      message: "All Users Fetched Sucesss",
      data: allUser,
    });
  } catch (error) {
    return res
      .status(500)
      .send({ success: false, message: `Get All User Ctrl ${error.message}` });
  }
};

const getUserController = async (req, res) => {
  try {
    const user = await userModel.findOne({ _id: req.body.id });
    if (!user) {
      return res.status(200).send({ success: false, message: "No User Found" });
    }
    return res.status(200).send({
      success: true,
      message: "User Fetched Sucesss",
      data: user,
    });
  } catch (error) {
    return res
      .status(500)
      .send({ success: false, message: `Get User Ctrl ${error.message}` });
  }
};

const editUserController = async (req, res) => {
  try {
    const { _id } = req.body;
    if (!_id) {
      return res.status(400).send({
        success: false,
        message: "Id is required in the request body",
      });
    }
    //updating user
    const user = await userModel.findOne({ _id: req.body._id });
    if (!user) {
      return res.status(200).send({ success: false, message: "No user found" });
    }
    if (req.body.addBalance) {
      const updateUser = await userModel.findOneAndUpdate(
        { _id },
        {
          $set: {
            ...req.body,
            balance: parseInt(user?.balance) + parseInt(req.body.addBalance),
          },
        },
        { new: true }
      );
      if (!updateUser) {
        return res.status(200).send({
          success: false,
          message: "Failed to Update User",
        });
      }

      const generateOrderId = (length) => {
        const numbers = "01234567"; // 10 numbers
        const randomNumbers = Array.from({ length: length }, () =>
          numbers.charAt(Math.floor(Math.random() * numbers.length))
        );
        const orderId = randomNumbers.join("");
        return orderId;
      };
      const obj = {
        name: updateUser?.fname,
        email: updateUser?.email,
        amount: req.body.addBalance,
        mobile: updateUser?.mobile,
        status: "success",
        upi_txn_id: generateOrderId(7),
        orderId: generateOrderId(12),
      };
      const newPayment = new paymentModel(obj);
      await newPayment.save();

      return res
        .status(201)
        .send({ success: true, message: "User Updated Successfully" });
    } else {
      const updateUser = await userModel.findOneAndUpdate(
        { _id },
        { $set: req.body },
        { new: true }
      );
      if (!updateUser) {
        return res.status(200).send({
          success: false,
          message: "Failed to Update User",
        });
      }
      return res
        .status(201)
        .send({ success: true, message: "User Updated Successfully" });
    }
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: `Admin Edit User Ctrl ${error.message}`,
    });
  }
};

const adminGetAllOrdersController = async (req, res) => {
  try {
    const orders = await orderModel.find({});
    if (!orders || orders.length === 0) {
      return res
        .status(200)
        .send({ success: false, message: "No Orders Found" });
    }

    const totalAmount = await orderModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: { $toDouble: "$price" } },
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
        },
      },
    ]);
    return res.status(201).send({
      success: true,
      message: "All Orders Fetched Success",
      data: orders,
      total: totalAmount.length > 0 ? totalAmount[0].total : 0,
    });
  } catch (error) {
    console.error("Error in adminGetAllOrdersController:", error);
    res.status(500).send({
      success: false,
      message: `Admin Get All Order Ctrl ${error.message}`,
    });
  }
};

const adminUpdateOrderController = async (req, res) => {
  try {
    const order = await orderModel.findOne({
      orderId: req.body.orderId,
    });
    if (!order) {
      return res
        .status(200)
        .send({ success: false, message: "No Order Found" });
    }
    const updateOrder = await orderModel.findOneAndUpdate(
      {
        orderId: req.body.orderId,
      },
      { $set: { status: req.body.status } },
      { new: true }
    );
    if (!updateOrder) {
      return res.status(201).send({
        success: false,
        message: "Failed to update the order",
      });
    }
    return res.status(202).send({
      success: true,
      message: "Order updated successfullt",
      data: updateOrder,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: `Admin Get All Order Ctrl ${error.message}`,
    });
  }
};

const getAllQueries = async (req, res) => {
  try {
    const queries = await contactModel.find({});
    if (queries.length === 0) {
      return res.status(200).send({
        success: false,
        message: "No Queries Found",
      });
    }
    return res.status(201).send({
      success: true,
      message: "Queries fetched success",
      data: queries,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: `Get All Queries Ctrl ${error.message}`,
    });
  }
};

const seenQueryController = async (req, res) => {
  try {
    const queries = await contactModel.findOne({ _id: req.body.id });
    if (!queries) {
      return res.status(200).send({
        success: false,
        message: "No Queries Found",
      });
    }
    const updateQuery = await contactModel.findOneAndUpdate(
      {
        _id: req.body.id,
      },
      { $set: { status: "seen" } },
      { new: true }
    );
    return res.status(201).send({
      success: true,
      message: "Query updated success",
      data: updateQuery,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: `Get All Queries Ctrl ${error.message}`,
    });
  }
};

const updateWebsiteController = async (req, res) => {
  try {
    const admin = await websiteModel.findOne({
      email: "admin@gmail.com",
    });
    if (!admin) {
      return res.status(201).send({
        success: false,
        message: "No Access",
      });
    }
    const updatedWebsiteStatus = !admin.website;
    const updateWebsite = await websiteModel.findOneAndUpdate(
      { email: "admin@gmail.com" },
      { $set: { website: updatedWebsiteStatus } },
      { new: true }
    );
    // Check if website update failed
    if (!updateWebsite) {
      return res.status(500).send({
        success: false,
        message: "Failed to update website",
      });
    }
    // Website updated successfully
    return res.status(200).send({
      success: true,
      message: "Website updated",
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: `Get All Queries Ctrl ${error.message}`,
    });
  }
};

const getWebsiteContoller = async (req, res) => {
  try {
    const website = await websiteModel.findOne({ email: "admin@gmail.com" });
    if (!website) {
      return res.status(201).send({ success: false, message: "Website Error" });
    }
    return res
      .status(200)
      .send({ success: true, message: "Website Fetched", data: website });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

const getAllCoupons = async (req, res) => {
  try {
    const coupons = await couponModel.find({});
    if (coupons.length === 0) {
      return res.status(201).send({
        success: false,
        message: "No Coupons Found",
      });
    }
    return res.status(200).send({
      success: true,
      message: "Coupons Fetched Success",
      data: coupons,
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: error.message,
    });
  }
};

const addCouponController = async (req, res) => {
  try {
    const { name, discount } = req.body;
    const existingCoupon = await couponModel.findOne({ name: req.body.name });
    if (existingCoupon) {
      return res.status(201).send({
        success: false,
        message: "Coupon with this name already exists",
      });
    }
    const coupon = new couponModel(req.body);
    await coupon.save();
    return res.status(200).send({
      success: true,
      message: "Coupon Added Successfully",
    });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

const deleteCouponController = async (req, res) => {
  try {
    const { id } = req.body;

    const existingCoupon = await couponModel.findOne({ _id: id });
    if (!existingCoupon) {
      return res.status(201).send({
        success: false,
        message: "Coupon not found",
      });
    }

    const result = await couponModel.findOneAndDelete({ _id: id });
    if (!result) {
      return res
        .status(201)
        .send({ success: false, message: "Failed to delete" });
    }
    return res
      .status(200)
      .send({ success: true, message: "Coupon deleted Successfully" });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: `Delete Coupon Ctrl ${error.message}`,
    });
  }
};

const adminAddMoneyController = async (req, res) => {
  try {
    const { orderId, email, mobile, amount, type, reason } = req.body;
    const user = await userModel.findOne({ mobile: mobile });
    if (!user) {
      return res
        .status(400)
        .send({ success: false, message: "User not found" });
    }
    const newBalance = Math.max(
      0,
      parseFloat(user?.balance) + parseFloat(amount)
    );
    const updateBalance = await userModel.findOneAndUpdate(
      { mobile: mobile },
      { $set: { balance: newBalance } },
      { new: true }
    );
    if (!updateBalance) {
      return res
        .status(400)
        .send({ success: false, message: "Failed to update balance" });
    }

    const newHistory = new walletHistoryModel({
      orderId: orderId,
      email: email,
      mobile: mobile,
      balanceBefore: user?.balance,
      balanceAfter: newBalance,
      amount: amount,
      product: "Admin",
      type: type,
      reason: reason,
      admin: true,
    });
    await newHistory.save();

    return res.status(200).send({ success: true, message: `${type} Success` });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
};

const AdminDashboardController = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    // Validate dates
    const from = new Date(fromDate);
    const to = new Date(toDate);

    if (isNaN(from) || isNaN(to)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid date range" });
    }

    // Set the end date to the end of the specified day
    to.setHours(23, 59, 59, 999);

    // calculating register wallet balance

    const registerWalletBalance = await registerWalletModel.find({
      createdAt: {
        $gte: from,
        $lte: to,
      },
    });

    const totalRegisterBalance = registerWalletBalance.reduce((total, item) => {
      const balance = parseFloat(item.amount) || 0;
      return total + balance;
    }, 0);

    // Fetch orders within the date range
    const orders = await orderModel.find({
      createdAt: {
        $gte: from,
        $lte: to,
      },
      status: "success",
    });

    // Fetch total number of products
    const products = await productModel.find();
    // Fetch queries within the date range
    const queries = await contactModel.find({});
    // Aggregate data for total sales, total orders, etc.
    const totalOrders = orders.length;

    const totalSales = orders.reduce((total, order) => {
      const price = parseFloat(order.price) || 0;
      return total + price;
    }, 0);

    const totalProfit = orders.reduce((total, order) => {
      const price = parseFloat(order.originalPrice) || 0;
      return total + price;
    }, 0);

    // Fetch top users (e.g., users with the highest total spending)
    const topUsers = await orderModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: from,
            $lte: to,
          },
          status: "success",
        },
      },
      {
        $group: {
          _id: "$customer_email",
          totalSpent: { $sum: { $toDouble: "$price" } }, // Ensure price is parsed as double
        },
      },
      {
        $sort: { totalSpent: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    // Aggregate monthly orders
    const monthlyOrders = await orderModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: from,
            $lte: to,
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalOrders: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    // Prepare monthly orders data for client-side
    const labels = [];
    const data = [];

    monthlyOrders.forEach((order) => {
      labels.push(`${order._id.year}-${order._id.month}`);
      data.push(order.totalOrders);
    });

    // Aggregate monthly sales
    const monthlySales = await orderModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: from,
            $lte: to,
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalSales: {
            $sum: { $toDouble: "$price" },
          },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    // Prepare monthly sales data for client-side
    const salesLabels = [];
    const salesData = [];

    monthlySales.forEach((sale) => {
      salesLabels.push(`${sale._id.year}-${sale._id.month}`);
      salesData.push(sale.totalSales);
    });

    //Users ke wallet me kitna paisa hai uska total
    const excludedEmails = ["aashirdigital@gmail.com"];
    const totalUsersWalletData = await userModel.aggregate([
      {
        $match: {
          email: { $nin: excludedEmails }, // Exclude users with these email addresses
        },
      },
      {
        $group: {
          _id: null, // We don't need to group by any field, so _id is set to null
          totalBalance: { $sum: "$balance" }, // Summing up the 'balance' field
        },
      },
    ]);

    const totalUserBalance = totalUsersWalletData[0]?.totalBalance || 0;

    return res.status(200).send({
      success: true,
      data: orders,
      products,
      queries,
      totalOrders,
      totalSales,
      topUsers,
      totalProfit,
      monthlyOrders: { labels, data },
      monthlySales: { salesLabels, salesData },
      totalUserBalance,
      totalRegisterBalance,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// balance

// smile
const smileBalanceController = async (req, res) => {
  try {
    const uid = process.env.UID;
    const email = process.env.EMAIL;
    const product = "mobilelegends";
    const time = Math.floor(Date.now() / 1000);
    const mKey = process.env.KEY;

    const signArr = {
      uid,
      email,
      product,
      time,
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
      uid,
      email,
      product,
      time,
      sign,
    });
    let apiUrl = "https://www.smile.one/br/smilecoin/api/querypoints";
    const response = await axios.post(apiUrl, formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    return res
      .status(200)
      .send({ success: true, data: response.data.smile_points });
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
    return res.status(500).send({ success: false, message: error.message });
  }
};

// moogold
const generateAuthSignature = (payload, timestamp, path) => {
  const stringToSign = `${JSON.stringify(payload)}${timestamp}${path}`;
  return crypto
    .createHmac("sha256", process.env.MOOGOLD_SECRET)
    .update(stringToSign)
    .digest("hex");
};
const generateBasicAuthHeader = () => {
  const credentials = `${process.env.MOOGOLD_PARTNER_ID}:${process.env.MOOGOLD_SECRET}`;
  return `Basic ${base64.encode(credentials)}`;
};
const moogoldBalanceContoller = async (req, res) => {
  try {
    const fieldsPayload = {
      path: "user/balance",
    };
    const timestampp = Math.floor(Date.now() / 1000);
    const pathh = "user/balance";
    const authSignaturee = generateAuthSignature(
      fieldsPayload,
      timestampp,
      pathh
    );
    const moogold = await axios.post(
      "https://moogold.com/wp-json/v1/api/user/balance",
      fieldsPayload,
      {
        headers: {
          Authorization: generateBasicAuthHeader(),
          auth: authSignaturee,
          timestamp: timestampp,
        },
      }
    );
    return res.status(200).send({
      success: true,
      message: "mooogold balance fetched",
      data: moogold.data.balance,
    });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

module.exports = {
  getAllUserController,
  getUserController,
  editUserController,
  adminGetAllOrdersController,
  adminUpdateOrderController,
  addCouponController,
  deleteCouponController,
  getAllQueries,
  seenQueryController,
  updateWebsiteController,
  getWebsiteContoller,
  addCouponController,
  getAllCoupons,
  //
  adminAddMoneyController,
  AdminDashboardController,
  // balance
  smileBalanceController,
  moogoldBalanceContoller,
};
