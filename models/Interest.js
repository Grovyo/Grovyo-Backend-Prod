const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const InterestSchema = new mongoose.Schema(
  {
    title: { type: String },
    desc: { type: String },
    post: { type: ObjectId, ref: "Post" },
    count: { type: Number },
  },
  { timestamps: true }
);

InterestSchema.index({ title: "text" });

module.exports = mongoose.model("Interest", InterestSchema);
