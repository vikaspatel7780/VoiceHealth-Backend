const nodemailer = require('nodemailer');

exports.sendOtpEmail = async (to, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: `"VoiceHealth - Health Assistant" <${process.env.EMAIL_USER}>`,
      to,
      subject: '🔐 Verify Your Email - VoiceHealth OTP Inside',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #0066cc;">Welcome to VoiceHealth!</h2>
          <p>Hi there 👋,</p>
          <p>Thank you for registering with <strong>VoiceHealth</strong>. To verify your email and activate your account, please use the OTP below:</p>
          <div style="font-size: 24px; font-weight: bold; margin: 20px 0; color: #2e7d32;">
            ${otp}
          </div>
          <p>This OTP is valid for <strong>10 minutes</strong>.</p>
          <p>If you did not request this, please ignore this email.</p>
          <hr />
          <p style="font-size: 12px; color: #888;">© ${new Date().getFullYear()} VoiceHealth. All rights reserved.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP sent to ${to}`);
  } catch (error) {
    console.error(`❌ Failed to send OTP to ${to}:`, error.message);
    throw new Error('Failed to send OTP email.');
  }
};
