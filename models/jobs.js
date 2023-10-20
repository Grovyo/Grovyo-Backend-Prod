const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const jobSchema = new mongoose.Schema(
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Jobs", jobSchema);
