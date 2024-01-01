const mongoose = require("mongoose");

const backgroundSchema = new mongoose.Schema({
  backgroundImage: String,
});

module.exports = mongoose.model("BackGround", backgroundSchema);
