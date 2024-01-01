const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    maxLength: 150,
    required: true,
  },
  brandname: {
    type: String,
    maxLength: 50,
    required: true,
  },
  desc: {
    type: String,
    required: true,
  },
  creator: {
    type: ObjectId,
    ref: "User",
    required: true,
  },
  orders: [
    {
      type: ObjectId,
      ref: "Order",
      required: true,
    },
  ],
  orderscount: { type: Number, default: 0 },
  quantity: {
    type: Number,
  },
  shippingcost: {
    type: Number,
  },
  price: {
    type: Number,
  },
  discountedprice: { type: Number },
  sellername: { type: String },
  images: [
    {
      content: { type: String },
      type: { type: String },
      size: { type: String },
      thumbnail: { type: String },
    },
  ],
  totalstars: {
    type: Number,
    default: 0,
  },
  reviews: { type: Number, default: 0 },
  producthighlightskey: { type: [String] },
  producthighlightsvalue: { type: [String] },
  productdetails: { type: String },
  producthighlights: { type: String },
  percentoff: { type: Number, default: 0 },
  questions: { type: Number, default: 0 },
  type: { type: String },
  tags: { type: [String] },
  weight: { type: String },
  reviewed: [{ type: ObjectId, ref: "User" }],
  status: {
    type: String,
    default: "Unblock",
    enum: ["Unblock", "Block"],
  },
  sharescount: { type: Number, default: 0 },
  // changed
  itemsold: { type: Number, default: 0 },
  collectionss: { type: ObjectId, ref: "Collectionss" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Product", productSchema);
