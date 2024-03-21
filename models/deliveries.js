const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const Deliveries = new mongoose.Schema({
  title: { type: String },
  amount: { type: Number },
  orderId: { type: Number },
  time: { type: Number },
  partner: { type: ObjectId, ref: "DelUser" },
  status: { type: String, default: "Not started" },
  type: { type: String },
  mode: { type: String },

  reason: { type: String },
  pickupaddress: {
    streetaddress: { type: String },
    state: { type: String },
    city: { type: String },
    landmark: { type: String },
    pincode: { type: Number },
    country: { type: String },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number },
      altitude: { type: Number },
      provider: { type: String },
      accuracy: { type: Number },
      speed: { type: Number },
      bearing: { type: Number },
    },
  },
  droppingaddress: {
    streetaddress: { type: String },
    state: { type: String },
    city: { type: String },
    landmark: { type: String },
    pincode: { type: Number },
    country: { type: String },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number },
      altitude: { type: Number },
      provider: { type: String },
      accuracy: { type: Number },
      speed: { type: Number },
      bearing: { type: Number },
    },
  },
  phonenumber: { type: Number },
  remarks: { type: String },
  timing: { type: String },
  data: [
    {
      product: { type: ObjectId, ref: "Product" },
      qty: { type: Number },
      seller: { type: ObjectId, ref: "User" },
      price: { type: Number, default: 0 },
    },
  ],
  verifypic: [{ type: String }],
});

Deliveries.index({ title: "text" });

module.exports = mongoose.model("DeliveriesSchema", Deliveries);
