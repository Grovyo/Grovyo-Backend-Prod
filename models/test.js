const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const testSchema = new mongoose.Schema({
  name: String,
  contentType: String,
  size: Number,
  uuid: String,
  location: String,
});

module.exports = mongoose.model("test", testSchema);
