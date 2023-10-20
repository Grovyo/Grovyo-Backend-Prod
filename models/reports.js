const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const ReportSchema = new mongoose.Schema(
  {
    senderId: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    desc: { type: String, required: true },
    status: {
      type: String,
      default: "Pending",
      enum: ["Resolved", "Pending"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", ReportSchema);
