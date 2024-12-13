module.exports = function (req, res, next) {
  const userAgent = req.headers["user-agent"];
  const isBrowser =
    userAgent.includes("Mozilla") && userAgent.includes("AppleWebKit");

  if (!isBrowser) {
    return res.status(403).send({
      success: false,
      message: "Unauthorized access :(",
    });
  }
  next();
};
