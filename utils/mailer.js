const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

const sendOtpEmail = async (toEmail, otp) => {
  await transporter.sendMail({
    from: `"Task Manager" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your verification code',
    html: `<p>Your verification code is:</p><h2>${otp}</h2><p>This code expires in 5 minutes.</p>`
  });
};

module.exports = sendOtpEmail;