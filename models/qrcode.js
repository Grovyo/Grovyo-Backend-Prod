const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const qrcodeSchema = new mongoose.Schema(
  {
    rid: {
      type: String,
      required: true,
      maxLength: 17,
      minLength: 17,
    },
    user: { type: ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Qr", qrcodeSchema);
