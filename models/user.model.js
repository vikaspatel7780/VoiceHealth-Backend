const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name: { type: String },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  contact_number: String,
  country_code: String,

  // User Address
  address_detail: {
    city: String,
    state: String,
    country: String,
    pincode: String
  },

  // Role-based Access: user, doctor, admin
  role: {
    type: String,
    enum: ['user', 'doctor', 'admin'],
    default: 'user'
  },

  // OTP verification
  otp: String,
  is_email_verified: { type: Boolean, default: false },

  // Auth info
  refresh_token: String,
  last_login_date: Date,

  // Doctor-specific fields (used only if role === 'doctor')
  doctor_info: {
    specialization: String,
    experience_years: Number,
    registration_number: String,
    verified_by_admin: { type: Boolean, default: false },
    education: [String],
    hospital_affiliations: [String],
    available_timings: {
      start_time: String, // e.g., "10:00 AM"
      end_time: String     // e.g., "06:00 PM"
    }
  },

  // For all users (optional health records)
  health_records: [{
    file_url: String,
    description: String,
    uploaded_at: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);
