const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const RevenueSchema = new mongoose.Schema(
  {
    text: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Revenue", RevenueSchema);
