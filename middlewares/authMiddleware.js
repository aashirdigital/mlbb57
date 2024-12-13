const JWT = require("jsonwebtoken");

module.exports = async (req, res, next) => {
  try {
    const token = req.headers["authorization"].split(" ")[1];
    JWT.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          return res
            .status(201)
            .send({ success: false, message: "Token expired" });
        } else {
          return res
            .status(202)
            .send({ success: false, message: "Auth Failed" });
        }
      } else {
        if (decoded.exp <= Date.now() / 1000) {
          return res
            .status(203)
            .send({ success: false, message: "Token expired" });
        }
        req.body.userId = decoded.id;
        next();
      }
    });
  } catch (error) {
    console.log(error);
    res.status(401).send({ success: false, message: "Auth Failed" });
  }
};
