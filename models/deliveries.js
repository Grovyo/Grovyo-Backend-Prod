const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const deliveries = new mongoose.Schema({
  title: { type: String },
  amount: { type: Number },
  orderId: { type: Number },
  time: { type: Number },
  partner: { type: ObjectId, ref: "DelUser" },
  address: {
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
  remarks: { type: String },
});

deliveries.index({ title: "text" });

module.exports = mongoose.model("Deliveries", deliveries);
