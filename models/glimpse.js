const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const glimpseSchema = new mongoose.Schema(
  {
    creator: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    dp: { type: String },
    name: { type: String },
    like: { type: Number, default: 0 },
    likedby: [{ type: ObjectId, ref: "User" }],
    disklike: { type: Number, default: 0 },
    disklikedby: [{ type: ObjectId, ref: "User" }],
    content: { type: String },
    tags: { type: [String] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Glimpse", glimpseSchema);
