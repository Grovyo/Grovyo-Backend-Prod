const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const AdTransactionsSchema = new mongoose.Schema(
  {
    transactionid: { type: String, unique: true },
    amount: { type: Number },
    advertiserid: { type: ObjectId, ref: "Advertiser" },
    adid: { type: ObjectId, ref: "Ads" },
    status: { type: String, default: "Pending" },
    type: { type: String },
  },
  { timestamps: true }
);

AdTransactionsSchema.index({ title: "text" });

module.exports = mongoose.model("AdTransactions", AdTransactionsSchema);
