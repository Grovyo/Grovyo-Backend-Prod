const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const Analytics = new mongoose.Schema({
  id: { type: String },
  date: { type: String },
  Y1: { type: Number },
  Y2: { type: Number },
  Y3: { type: Number },
  Sales: { type: Number },
  click: { type: Number, default: 0 },
  impressions: { type: Number, default: 0 },
  cpc: { type: Number, default: 0 },
  cost: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
});

module.exports = mongoose.model("Analytics", Analytics);
