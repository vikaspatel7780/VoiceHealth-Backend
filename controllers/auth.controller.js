const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendOtpEmail } = require("../utils/mailer");

// 🔑 JWT Utility
const generateToken = (payload, secret, expiresIn) => {
  return jwt.sign(payload, secret, { expiresIn });
};

// 🔐 Register
exports.register = async (req, res) => {
  const {
    first_name,
    last_name,
    email,
    password,
    contact_number,
    country_code,
    address_detail,
    role = "user",
  } = req.body;

  try {
    const allowedRoles = ["user", "doctor", "admin"];
    if (!allowedRoles.includes(role)) {
      return res
        .status(400)
        .json({ message: "Invalid role specified", success: false });
    }

    if (role === "admin") {
      return res
        .status(403)
        .json({ message: "Admin registration not allowed", success: false });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Email already exists", success: false });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const user = await User.create({
      first_name,
      last_name,
      email,
      password: hashedPassword,
      contact_number,
      country_code,
      address_detail,
      role,
      otp,
      otp_expiry: otpExpiry,
      is_email_verified: false,
    });

    await sendOtpEmail(email, otp);

    res.status(200).json({
      message: "User registered. OTP sent to email.",
      success: true,
      data: {
        _id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        contact_number: user.contact_number,
        country_code: user.country_code,
        address_detail: user.address_detail,
        role: user.role,
        is_email_verified: user.is_email_verified, // This will be false
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 📧 Verify OTP
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    if (user.is_email_verified) {
      return res
        .status(400)
        .json({ message: "Email already verified", success: false });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP", success: false });
    }

    if (user.otp_expiry && user.otp_expiry < new Date()) {
      return res.status(400).json({ message: "OTP expired", success: false });
    }

    user.is_email_verified = true;
    user.otp = "";
    user.otp_expiry = null;

    const accessToken = generateToken(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      "1d"
    );
    const refreshToken = generateToken(
      { id: user._id, role: user.role },
      process.env.JWT_REFRESH_SECRET,
      "7d"
    );

    user.refresh_token = refreshToken;
    user.last_login_date = new Date();

    await user.save();

    const responseUser = {
      id: user._id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      is_email_verified: user.is_email_verified,
    };

    if (user.role === "doctor") {
      responseUser.doctor_info = user.doctor_info || {};
    }

    res.json({
      message: "Email verified and logged in successfully",
      success: true,
      data: {
        accessToken,
        user: responseUser,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
// 📧 Resend OTP
exports.resendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    if (user.is_email_verified) {
      return res
        .status(400)
        .json({ message: "Email is already verified", success: false });
    }

    // Generate new OTP and expiry
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otp_expiry = otpExpiry;
    await user.save();

    await sendOtpEmail(email, otp);

    res.status(200).json({
      message: "New OTP has been sent to your email",
      success: true,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 🔐 Login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Invalid credentials", success: false });
    }

    if (!user.is_email_verified) {
      return     res.status(200).json({
      message: "User registered. OTP sent to email.",
      success: true,
      data: {
        _id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        contact_number: user.contact_number,
        country_code: user.country_code,
        address_detail: user.address_detail,
        role: user.role,
        is_email_verified: user.is_email_verified, // This will be false
      },
    });
    }

    const accessToken = generateToken(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      "1d"
    );
    const refreshToken = generateToken(
      { id: user._id, role: user.role },
      process.env.JWT_REFRESH_SECRET,
      "7d"
    );

    user.refresh_token = refreshToken;
    user.last_login_date = new Date();

    await user.save();

    const responseUser = {
      id: user._id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
    };

    if (user.role === "doctor") {
      responseUser.doctor_info = user.doctor_info || {};
    }

    res.json({
      message: "Login successful",
      success: true,
      data: {
        accessToken,
        user: responseUser,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
