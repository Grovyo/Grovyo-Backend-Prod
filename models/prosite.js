const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const prositeSchema = new mongoose.Schema({
  name: {
    type: String,
    maxLength: 150,
  },
  text: {
    type: String,
  },
  text1: {
    type: String,
  },
  desc: {
    type: String,
  },
  creator: {
    type: ObjectId,
    ref: "User",
  },
  htmlcontent: {
    type: String,
  },
  lottie: { type: String },
  image1: { type: String },
  image2: { type: String },
  price: {
    type: Number,
  },
  css: { m: { type: String }, c: { type: String } },
  sellerId: {
    type: ObjectId,
    ref: "User",
  },
  bgimage: { type: String },
  like: { type: Number, default: 0 },
  category: { type: String },
  tags: { type: [String] },
  status: {
    type: String,
    default: "Unblock",
    enum: ["Unblock", "Block"],
  },
  sharescount: { type: Number, default: 0 },
  creator: { type: ObjectId, ref: "User" },
  webpng: { type: String },
  mobilepng: { type: String },
  title: { type: String },
  web: { type: String },
  mobile: Object,
  image: { type: String },
});

module.exports = mongoose.model("Prosite", prositeSchema);
