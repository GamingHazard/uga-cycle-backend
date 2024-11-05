const nodemailer = require("nodemailer");

const sendResetPasswordEmail = async (email, resetUrl) => {
  // Create a transporter object using your email service provider's settings
  const transporter = nodemailer.createTransport({
    host: "smtp.your-email-provider.com", // Your email provider's SMTP server
    port: 587, // Usually 587 for TLS or 465 for SSL
    secure: false, // Use true for 465, false for other ports
    auth: {
      user: "your-email@example.com", // Your email address
      pass: "your-email-password", // Your email password or app password
    },
  });

  // Define the email options
  const mailOptions = {
    from: '"Your App Name" <your-email@example.com>', // Sender address
    to: email, // Recipient address
    subject: "Password Reset Request", // Subject line
    html: `<p>You requested a password reset.</p>
           <p>Click <a href="${resetUrl}">here</a> to reset your password.</p>
           <p>If you did not request this, please ignore this email.</p>`, // HTML body
  };

  // Send the email
  try {
    await transporter.sendMail(mailOptions);
    console.log("Reset password email sent to:", email);
  } catch (error) {
    console.error("Error sending reset password email:", error);
    throw new Error("Failed to send email");
  }
};

module.exports = sendResetPasswordEmail;
