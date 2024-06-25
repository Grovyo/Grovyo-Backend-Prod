const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const Amountschema = new mongoose.Schema(
  {
    price: { type: Number },
    title: { type: String },
  },
  { timestamps: false }
);

Amountschema.index({ date: "text" });

module.exports = mongoose.model("Amounts", Amountschema);
