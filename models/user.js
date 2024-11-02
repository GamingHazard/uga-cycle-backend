const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true,
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
  }, // Added phone field
  password: {
    type: String,
    required: true,
  },
  profilePicture: {
    type: String,
  },
  joindDate: {
    type: Date,
    default: Date.now,
  },
  sentFollowRequests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  receivedFollowRequests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  followers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  verified: {
    type: Boolean,
    default: false,
  },
  verificationToken: {
    type: String,
  },
});

// Create the User model using the combined schema
const User = mongoose.model("User", userSchema);

module.exports = User;
