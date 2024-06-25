const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const Deliveries = new mongoose.Schema({
  title: { type: String },
  amount: { type: Number }, //to be collected
  orderId: { type: Number },
  time: { type: Number },
  earning: { type: Number },
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
  data: Array,
  // data: [
  //   {
  //     product: { type: ObjectId, ref: "Product" },
  //     qty: { type: Number },
  //     seller: { type: ObjectId, ref: "User" },
  //     price: { type: Number, default: 0 },
  //   },
  // ],
  verifypic: [{ type: String }],
  marks: [
    {
      latitude: String,
      longitude: String,
      address: Object,
      done: Boolean,
      pic: String,
    },
  ],
  where: { type: String, enum: ["affiliate", "customer"] },
  affid: { type: ObjectId, ref: "DelUser" },
  buyer: { type: ObjectId, ref: "User" },
});

Deliveries.index({ title: "text" });

module.exports = mongoose.model("DeliveriesSchema", Deliveries);
