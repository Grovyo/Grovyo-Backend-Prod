const mongoose = require("mongoose");

const templateSchema = new mongoose.Schema({
  backgroundColorDetails: {
    backgroundColor: { type: String },
    textcolor: { type: String },
    buttonColor: { type: String },
  },
  backgroundImage: { type: String },
  button: {
    backgroundColor: { type: String },
    Color: { type: String },
    borderTop: { type: String },
    borderBottom: { type: String },
    borderRight: { type: String },
    borderLeft: { type: String },
    paddingX: { type: String },
    paddingY: { type: String },
    borderRadiusTop: { type: String },
    borderRadiusBottom: { type: String },
    borderRadiusRight: { type: String },
    borderRadiusLeft: { type: String },
    boxShadow: { type: String },
    fontBold: { type: String },
    text: { type: String },
    image: { type: String, default: null },
  },
  color: {
    bg: { type: String },
    text: { type: String },
    button: { type: String },
    number: { type: Number },
  },
  developperpost: {
    devPostFile: { type: String },
    Imagetype: {
      type: String,
      default: "Free",
    },
  },
  font: {
    fontType: { type: String },
    fontSize: { type: String },
    fontWeight: { type: Number },
    textShadow: { type: String },
  },
  image: {
    myFile: { type: String },
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  lottieFile: { type: String },
});

module.exports = templateSchema;
