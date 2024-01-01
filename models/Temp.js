const mongoose = require("mongoose")

const TempSchema = new mongoose.Schema({
	post: String,
	idd: Number,
	setNm: String,
});

module.exports = mongoose.model("Temp", TempSchema);