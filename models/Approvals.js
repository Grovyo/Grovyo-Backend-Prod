const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const Approvals = new mongoose.Schema(
  { id: { type: String }, status: { type: String, default: "pending" } },

  { timestamps: true }
);

Approvals.index({ title: "text" });

module.exports = mongoose.model("Approvals", Approvals);
