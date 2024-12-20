const mongoose = require("mongoose");

const ServiceSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  company: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  serviceType: { type: String, required: true },
  region: { type: String, required: true },
  district: { type: String, required: true },
  registrationType: { type: String, required: true },
  pickupSchedule: { type: String, required: true },
  wasteType: { type: String, required: true },
  status: { type: String, default: "" },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Add a 2dsphere index for the location field to enable geospatial queries
ServiceSchema.index({ location: "2dsphere" });

const Services = mongoose.model("Services", ServiceSchema);

module.exports = Services;
