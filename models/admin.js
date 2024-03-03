const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const Adminschema = new mongoose.Schema(
  {
    activity: [
      {
        date: { type: Number },
        users: [
          { who: { ref: "User", type: ObjectId }, count: { type: Number } },
        ],
        activeuser: { type: Number, default: 0 },
        returning: [{ type: ObjectId, ref: "User" }],
      },
    ],
  },
  { timestamps: false }
);

Adminschema.index({ title: "text" });

module.exports = mongoose.model("Ads", Adminschema);
