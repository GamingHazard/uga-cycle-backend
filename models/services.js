const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    Service_provider_name: { type: String, required: true },
    fullName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    registrationType: { type: String, required: true },
    pickupSchedule: { type: String, required: true },
    region: { type: String, required: true },
    district: { type: String, required: true },
    Registered_on: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Registration = mongoose.model("Registration", registrationSchema);
module.exports = Registration;
