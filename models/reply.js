const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const replySchema = new mongoose.Schema(
  {
    senderId: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    commentId: { type: ObjectId, ref: "Comment", required: true },
    text: {
      type: String,
      required: true,
    },
    dp: { type: String },
    name: { type: String },
    like: { type: Number, default: 0 },
    disklike: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Reply", replySchema);
