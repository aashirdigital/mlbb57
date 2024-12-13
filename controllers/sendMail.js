const nodemailer = require("nodemailer");

module.exports = async (email, subject, otp, msg) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      auth: {
        user: process.env.MAIL,
        pass: process.env.APP_PASSWORD,
      },
    });
    await transporter.sendMail({
      from: process.env.MAIL,
      to: email,
      subject: subject,
      text: `${msg} ${otp}`,
      html: `${msg} <b>${otp}</b>`,
    });
    return { success: true, message: "Email sent successfully" };
  } catch (error) {
    console.log("Email not sent");
    console.log(error);
    return {
      success: false,
      message: "Email not sent",
      error: error.message,
    };
  }
};
