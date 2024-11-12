const mongoose = require("mongoose");

const ServicesSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  companyName: { type: String, required: true },
  fullName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  region: { type: String, required: true },
  district: { type: String, required: true },
  registrationType: { type: String, required: true },
  pickupSchedule: { type: String, required: true },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Services = mongoose.model("Services", ServicesSchema);

module.exports = Services;
