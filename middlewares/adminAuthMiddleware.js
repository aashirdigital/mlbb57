const JWT = require("jsonwebtoken");
const userModel = require("../models/userModel"); // Replace with your actual User model path

module.exports = async (req, res, next) => {
  try {
    const token =
      req.headers["authorization"] &&
      req.headers["authorization"].split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .send({ success: false, message: "Auth Failed: Token missing" });
    }

    JWT.verify(token, process.env.JWT_SECRET, async (err, decode) => {
      if (err) {
        return res
          .status(401)
          .send({ success: false, message: "Auth Failed: Invalid token" });
      } else {
        // Fetch the user from the database using the decoded ID
        const user = await userModel.findById(decode.id);

        if (!user) {
          return res
            .status(404)
            .send({ success: false, message: "User not found" });
        }

        // Check if the user has the 'admin' role
        if (user.isAdmin) {
          req.body.userId = user._id;
          next();
        } else {
          return res.status(403).send({
            success: false,
            message: "Access Denied: Insufficient permissions",
          });
        }
      }
    });
  } catch (error) {
    console.log(error);
    res.status(401).send({ success: false, message: "Auth Failed" });
  }
};
