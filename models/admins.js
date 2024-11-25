const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true,
  },
  organization: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    match: /^[0-9]{10}$/, // Adjust this pattern as needed
  },
  password: {
    type: String,
    required: true,
  },
  profilePicture: {
    type: String,
    default: "",
  },
  role: {
    type: String,
  },
  joinDate: {
    type: Date,
    default: Date.now,
  },

  verified: {
    type: Boolean,
    default: false,
  },
  verificationToken: {
    type: String,
    default: "",
  },
});

const Admin = mongoose.model("Admin", AdminSchema);

module.exports = Admin;
