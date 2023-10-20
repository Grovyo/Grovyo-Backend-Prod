const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const questionSchema = new mongoose.Schema(
  {
    senderId: { type: ObjectId, ref: "User", required: true },
    ques: { type: String, maxLength: 150, required: true },
    like: { type: Number, default: 0 },
    likedby: [{ type: ObjectId, ref: "User" }],
    productId: { type: ObjectId, ref: "Product", required: true },
    answer: { type: String, maxLength: 300 },
  },
  { timestamps: true }
);
module.exports = mongoose.model("Questions", questionSchema);
