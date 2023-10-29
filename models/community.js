const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const communitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },

    creator: { type: ObjectId, ref: "User", required: true },
    category: { type: String, required: true },
    dp: { type: String, required: true },
    members: [{ type: ObjectId, ref: "User", required: true }],
    memberscount: { type: Number, default: 0 },
    posts: [{ type: ObjectId, ref: "Post", required: true }],
    totalposts: { type: Number, default: 0 },
    tags: { type: [String] },
    desc: { type: String },
    preview: { type: [String] },
    topics: [{ type: ObjectId, ref: "Topic" }],
    totaltopics: { type: Number, default: 2 },
    type: { type: String, default: "public" },
    isverified: { type: Boolean, default: false },
    status: {
      type: String,
      default: "Unblock",
      enum: ["Unblock", "Block"],
    },
    moderators: [{ type: ObjectId, ref: "User", required: true }],
    admins: [{ type: ObjectId, ref: "User", required: true }],
    visitors: { type: Number, default: 0 },
    newmemberscount: { type: Number, default: 0 },
    newmembers: [{ type: ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

communitySchema.index({ title: "text" });

module.exports = mongoose.model("Community", communitySchema);
