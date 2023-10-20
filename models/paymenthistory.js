const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, default: 0 },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "completed", "failed"],
    },
    paymentId: { type: String },
    buyerId: { type: ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payments", paymentSchema);
