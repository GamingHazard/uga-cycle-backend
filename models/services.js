const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true }, // Add user ID field
    fullName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    registrationType: { type: String, required: true },
    pickupSchedule: { type: String, required: true },
    region: { type: String, required: true },
    district: { type: String, required: true },
  },
  { timestamps: true }
);

const Registration = mongoose.model("Registration", registrationSchema);
module.exports = Registration;
