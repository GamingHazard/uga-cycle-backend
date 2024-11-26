const mongoose = require("mongoose");

const ServiceSchema = new mongoose.Schema({
  fullName: { type: String, required: true }, // Full name of the user
  email: { type: String, required: true, unique: true }, // Full name of the user
  company: { type: String, required: true }, // Full name of the user
  phoneNumber: { type: String, required: true }, // User's phone number
  serviceType: { type: String, required: true }, // User's selected region
  region: { type: String, required: true }, // User's selected region
  district: { type: String, required: true }, // User's selected district
  registrationType: { type: String, required: true }, // User's selected registration type
  pickupSchedule: { type: String, required: true }, // User's selected pickup schedule
  wasteType: { type: String, required: true }, // User's selected pickup schedule
  location: { type: String, default: "" }, // User's selected pickup schedule
  status: { type: String, default: "" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Reference to the user

  createdAt: {
    type: Date,
    default: Date.now, // Timestamp of when the service was created
  },
});

const Services = mongoose.model("Services", ServiceSchema); // Change model name to 'Service'

module.exports = Services;
