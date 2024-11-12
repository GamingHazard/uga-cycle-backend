const mongoose = require("mongoose");

const ServicesSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    componentName: { type: String },
    fullName: { type: String },
    phoneNumber: { type: String },
    region: { type: String }, // New field for region
    district: { type: String }, // New field for district
    registrationType: { type: String },
    pickupSchedule: { type: String },
    // You can add any other fields required by your form
  },
  { timestamps: true }
);

const Services = mongoose.model("Services", ServicesSchema);

module.exports = Services;
