const mongoose = require("mongoose");

const salesPostSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  companyName: { type: String, required: true },
  telNumber: { type: String, required: true },
  content: { type: String, required: true },
  items: [
    {
      item: { type: String, required: true },
      price: { type: Number, required: true },
    },
  ],
  replies: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      content: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const salesPost = mongoose.model("salesPost", salesPostSchema);

module.exports = salesPost;
