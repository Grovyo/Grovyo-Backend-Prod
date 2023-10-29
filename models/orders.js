const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const OrderSchema = new mongoose.Schema(
  {
    buyerId: { type: ObjectId, ref: "User" },
    productId: [{ type: ObjectId, ref: "Product" }],
    sellerId: [{ type: ObjectId, ref: "User" }],
    delivered: { type: Boolean, default: false },
    quantity: { type: Number, min: 1 },
    total: { type: Number, min: 0 },
    currentStatus: {
      type: String,
      enum: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "completed",
        "failed",
        "returned",
        "damaged",
        "success",
      ],
      default: "pending",
    },
    orderId: { type: String, unique: true },
    deliverycharges: { type: Number, min: 0 },
    taxes: { type: Number, min: 0 },
    paymentMode: {
      type: String,
      enum: ["Cash", "UPI", "Card"],
      default: "Cash",
    },
    discountamount: { type: Number, min: 0 },
    finalprice: { type: Number, min: 0 },
    paymentId: { type: String },
    topicId: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
