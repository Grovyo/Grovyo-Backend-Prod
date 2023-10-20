const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const VerificationSchema = new mongoose.Schema(
  {
    id: { type: ObjectId, ref: "Advertiser" },
    status: { type: String, default: "pending" },
    name: { type: String },
    file: { type: String },
  },
  { timestamps: true }
);

VerificationSchema.index({ title: "text" });

module.exports = mongoose.model("Verification", VerificationSchema);
